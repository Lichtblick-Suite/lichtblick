// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Logger from "@lichtblick/log";
import { BuiltinPanelExtensionContext } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";
import dracoDecoderWasmUrl from "three/examples/jsm/libs/draco/draco_decoder.wasm";
import dracoWasmWrapperJs from "three/examples/jsm/libs/draco/draco_wasm_wrapper.js?raw";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

const log = Logger.getLogger(__filename);

export type MeshUpAxis = "y_up" | "z_up";
export const DEFAULT_MESH_UP_AXIS: MeshUpAxis = "y_up";

export type ModelCacheOptions = {
  edgeMaterial: THREE.Material;
  ignoreColladaUpAxis: boolean;
  meshUpAxis: MeshUpAxis;
  fetchAsset: BuiltinPanelExtensionContext["unstable_fetchAsset"];
};

type LoadModelOptions = {
  overrideMediaType?: string;
  /** A URL to e.g. a URDf which may be used to resolve mesh package:// URLs */
  referenceUrl?: string;
};

export type LoadedModel = THREE.Group | THREE.Scene;

type ErrorCallback = (err: Error) => void;

const DEFAULT_COLOR = new THREE.Color(0x248eff);

const GLTF_MIME_TYPES = ["model/gltf", "model/gltf-binary", "model/gltf+json"];
// Sourced from <https://github.com/Ultimaker/Cura/issues/4141>
const STL_MIME_TYPES = ["model/stl", "model/x.stl-ascii", "model/x.stl-binary", "application/sla"];
const DAE_MIME_TYPES = ["model/vnd.collada+xml"];
const OBJ_MIME_TYPES = ["model/obj", "text/prs.wavefront-obj"];

export class ModelCache {
  #textDecoder = new TextDecoder();
  #models = new Map<string, Promise<LoadedModel | undefined>>();
  #edgeMaterial: THREE.Material;
  #fetchAsset: BuiltinPanelExtensionContext["unstable_fetchAsset"];
  #colladaTextureObjectUrls = new Map<string, string>();
  #dracoLoader?: DRACOLoader;

  public constructor(public readonly options: ModelCacheOptions) {
    this.#edgeMaterial = options.edgeMaterial;
    this.#fetchAsset = options.fetchAsset;
  }

  public async load(
    url: string,
    opts: LoadModelOptions,
    reportError: ErrorCallback,
  ): Promise<LoadedModel | undefined> {
    let promise = this.#models.get(url);
    if (promise) {
      return await promise;
    }

    promise = this.#loadModel(url, opts, reportError)
      .then((model) => addEdges(model, this.#edgeMaterial))
      .catch(async (err) => {
        reportError(err as Error);
        return undefined;
      });

    this.#models.set(url, promise);
    return await promise;
  }

  async #loadModel(
    url: string,
    options: LoadModelOptions,
    reportError: ErrorCallback,
  ): Promise<LoadedModel> {
    const GLB_MAGIC = 0x676c5446; // "glTF"

    const asset = await this.#fetchAsset(url, { referenceUrl: options.referenceUrl });

    const buffer = asset.data;
    if (buffer.byteLength < 4) {
      throw new Error(`${buffer.byteLength} bytes received`);
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const contentType = options.overrideMediaType ?? asset.mediaType ?? "";

    // Check if this is a glTF .glb or .gltf file
    if (
      GLB_MAGIC === view.getUint32(0, false) ||
      GLTF_MIME_TYPES.includes(contentType) ||
      /\.glb$/i.test(url) ||
      /\.gltf$/i.test(url)
    ) {
      return await this.#loadGltf(url, reportError);
    }

    // Check if this is a STL file based on content-type or file extension
    if (STL_MIME_TYPES.includes(contentType) || /\.stl$/i.test(url)) {
      // Create a copy of the array buffer to respect the `byteOffset` and `byteLength` value as
      // the underlying three.js STLLoader only accepts an ArrayBuffer instance.
      return this.#loadSTL(
        url,
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        this.options.meshUpAxis,
      );
    }

    // Check if this is a COLLADA file based on content-type or file extension
    if (DAE_MIME_TYPES.includes(contentType) || /\.dae$/i.test(url)) {
      const text = this.#textDecoder.decode(buffer);
      return await this.#loadCollada(url, text, this.options.ignoreColladaUpAxis, reportError);
    }

    // Check if this is an OBJ file based on content-type or file extension
    if (OBJ_MIME_TYPES.includes(contentType) || /\.obj$/i.test(url)) {
      const text = this.#textDecoder.decode(buffer);
      return await this.#loadOBJ(url, text, this.options.meshUpAxis, reportError);
    }

    throw new Error(`Unknown ${buffer.byteLength} byte mesh (content-type: "${contentType}")`);
  }

  async #loadGltf(url: string, reportError: ErrorCallback): Promise<LoadedModel> {
    const onError = (assetUrl: string) => {
      const originalUrl = unrewriteUrl(assetUrl);
      log.error(`Failed to load GLTF asset "${originalUrl}" for "${url}"`);
      reportError(new Error(`Failed to load GLTF asset "${originalUrl}"`));
    };

    const manager = new THREE.LoadingManager(undefined, undefined, onError);
    manager.setURLModifier(rewriteUrl);
    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    gltfLoader.setDRACOLoader(this.#getDracoLoader(manager));

    manager.itemStart(url);
    const gltf = await gltfLoader.loadAsync(url);
    manager.itemEnd(url);

    // THREE.js uses Y-up, while Studio follows the ROS
    // [REP-0103](https://www.ros.org/reps/rep-0103.html) convention of Z-up
    gltf.scene.rotateX(Math.PI / 2);

    return gltf.scene;
  }

  #loadSTL(url: string, buffer: ArrayBuffer, meshUpAxis: MeshUpAxis): LoadedModel {
    // STL files do not reference any external assets, no LoadingManager needed
    const stlLoader = new STLLoader();
    const bufferGeometry = stlLoader.parse(buffer);
    log.debug(`Finished loading STL from ${url}`);
    const material = new THREE.MeshStandardMaterial({
      name: url.slice(-32), // truncate to 32 characters
      color: DEFAULT_COLOR,
      metalness: 0,
      roughness: 1,
      dithering: true,
    });
    const mesh = new THREE.Mesh(bufferGeometry, material);
    const group = new THREE.Group();
    group.add(mesh);

    // THREE.js uses Y-up, while Studio follows the ROS
    // [REP-0103](https://www.ros.org/reps/rep-0103.html) convention of Z-up
    if (meshUpAxis === "y_up") {
      group.rotateX(Math.PI / 2);
    }

    return group;
  }

  async #loadCollada(
    url: string,
    text: string,
    // eslint-disable-next-line @foxglove/no-boolean-parameters
    ignoreUpAxis: boolean,
    reportError: ErrorCallback,
  ): Promise<LoadedModel> {
    const onError = (assetUrl: string) => {
      const originalUrl = unrewriteUrl(assetUrl);
      log.error(`Failed to load COLLADA asset "${originalUrl}" for "${url}"`);
      reportError(new Error(`Failed to load COLLADA asset "${originalUrl}"`));
    };

    // The three.js ColladaLoader handles <up_axis> by detecting Z_UP and simply
    // applying a scene rotation. Since Studio is already Z_UP, we do our own
    // <up_axis> handling and skip rotation entirely for the Z_UP case
    const xml = new DOMParser().parseFromString(text, "application/xml");
    const upAxis = ignoreUpAxis
      ? "Z_UP"
      : (xml.querySelector("up_axis")?.textContent ?? "Y_UP").trim().toUpperCase();
    xml.querySelectorAll("up_axis").forEach((node) => {
      node.remove();
    });
    const xmlText = xml.documentElement.outerHTML;

    // Preload textures. We do this here since we can't pass in an async function in LoadingManager.setURLModifier
    // which is supposed to be used for overriding loading behavior. See also
    // https://threejs.org/docs/index.html#api/en/loaders/managers/LoadingManager.setURLModifier
    for await (const node of xml.querySelectorAll("init_from")) {
      if (!node.textContent) {
        continue;
      }

      try {
        const textureUrl = new URL(node.textContent, baseUrl(url)).toString();
        if (this.#colladaTextureObjectUrls.has(textureUrl)) {
          continue;
        }
        const textureAsset = await this.#fetchAsset(textureUrl);
        const objectUrl = URL.createObjectURL(
          new Blob([textureAsset.data], { type: textureAsset.mediaType }),
        );
        this.#colladaTextureObjectUrls.set(textureUrl, objectUrl);
      } catch (e) {
        log.error(e);
        onError(node.textContent);
      }
    }

    const manager = new THREE.LoadingManager(undefined, undefined, onError);
    manager.setURLModifier((u) => this.#colladaTextureObjectUrls.get(u) ?? rewriteUrl(u));
    const daeLoader = new ColladaLoader(manager);

    manager.itemStart(url);
    const dae = daeLoader.parse(xmlText, baseUrl(url));
    manager.itemEnd(url);

    // If the <up_axis> is Y_UP, rotate to the Studio convention of Z-up following
    // ROS [REP-0103](https://www.ros.org/reps/rep-0103.html)
    if (upAxis === "Y_UP") {
      dae.scene.rotateX(Math.PI / 2);
    }

    return fixDaeMaterials(dae.scene);
  }

  async #loadOBJ(
    url: string,
    text: string,
    meshUpAxis: MeshUpAxis,
    reportError: ErrorCallback,
  ): Promise<LoadedModel> {
    const onError = (assetUrl: string) => {
      const originalUrl = unrewriteUrl(assetUrl);
      log.error(`Failed to load OBJ asset "${originalUrl}" for "${url}"`);
      reportError(new Error(`Failed to load OBJ asset "${originalUrl}"`));
    };

    const manager = new THREE.LoadingManager(undefined, undefined, onError);
    manager.setURLModifier(rewriteUrl);
    const objLoader = new OBJLoader(manager);

    manager.itemStart(url);
    const group = objLoader.parse(text);
    manager.itemEnd(url);

    // THREE.js uses Y-up, while Studio follows the ROS
    // [REP-0103](https://www.ros.org/reps/rep-0103.html) convention of Z-up
    if (meshUpAxis === "y_up") {
      group.rotateX(Math.PI / 2);
    }

    return fixObjMaterials(group);
  }

  // singleton dracoloader
  #getDracoLoader(manager: THREE.LoadingManager): DRACOLoader {
    let dracoLoader = this.#dracoLoader;
    if (!dracoLoader) {
      dracoLoader = new DRACOLoader(manager);
      // Hack in a replacement function to load assets from the webpack bundle
      (dracoLoader as { _loadLibrary?: (url: string, responseType: string) => unknown })[
        "_loadLibrary"
      ] = async function (url: string, responseType: string) {
        if (url === "draco_wasm_wrapper.js" && responseType === "text") {
          return dracoWasmWrapperJs;
        } else if (url === "draco_decoder.wasm" && responseType === "arraybuffer") {
          return await (await fetch(dracoDecoderWasmUrl)).arrayBuffer();
        } else {
          throw new Error(
            `DRACOLoader attempt to load non-bundled asset: ${url} as ${responseType}`,
          );
        }
      };
      this.#dracoLoader = dracoLoader;
    }

    dracoLoader.manager = manager;
    return dracoLoader;
  }

  public dispose(): void {
    this.#colladaTextureObjectUrls.forEach((_key, objectUrl) => {
      URL.revokeObjectURL(objectUrl);
    });
    // DRACOLoader is only loader that needs to be disposed because it uses a webworker
    this.#dracoLoader?.dispose();
    this.#dracoLoader = undefined;
  }
}

export const EDGE_LINE_SEGMENTS_NAME = "edges";
function addEdges(model: LoadedModel, edgeMaterial: THREE.Material): LoadedModel {
  const edgesToAdd: [edges: THREE.LineSegments, parent: THREE.Object3D][] = [];

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    // Enable shadows for all meshes
    child.castShadow = true;
    child.receiveShadow = true;

    // Draw edges for all meshes
    const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 40);
    const line = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    line.name = EDGE_LINE_SEGMENTS_NAME;
    edgesToAdd.push([line, child]);
  });

  for (const [line, parent] of edgesToAdd) {
    parent.add(line);
  }
  return model;
}

function fixDaeMaterials(model: LoadedModel): LoadedModel {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (child.material instanceof THREE.MeshLambertMaterial) {
      const material = toStandard(child.material);
      child.material.dispose();
      child.material = material;
    } else if (child.material instanceof THREE.MeshStandardMaterial) {
      child.material.dithering = true;
    }
  });
  return model;
}

function fixObjMaterials(model: LoadedModel): LoadedModel {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (child.material instanceof THREE.MeshPhongMaterial) {
      const material = toStandard(child.material);
      child.material.dispose();
      child.material = material;
    } else if (child.material instanceof THREE.MeshStandardMaterial) {
      child.material.metalness = 0;
      child.material.roughness = 1;
      child.material.dithering = true;
    }
  });
  return model;
}

function toStandard(
  material: THREE.MeshPhongMaterial | THREE.MeshLambertMaterial,
): THREE.MeshStandardMaterial {
  const standard = new THREE.MeshStandardMaterial({ name: material.name });
  const shininess = (material as Partial<THREE.MeshPhongMaterial>).shininess ?? 0; // [0-100]

  // MeshStandardMaterial.copy() assumes the normalScale property exists, which
  // is true for other MeshStandardMaterials or MeshPhongMaterial but not
  // MeshLambertMaterial. Default initialize this property if needed so the
  // `standard.copy(material)` below succeeds
  const maybePhong = material as Partial<THREE.MeshPhongMaterial>;
  maybePhong.normalScale ??= new THREE.Vector2(1, 1);

  standard.copy(material);
  standard.metalness = 0;
  standard.roughness = 1 - shininess / 100;
  standard.dithering = true;
  return standard;
}

// The THREE.TextureLoader does not support loading .tiff files into textures. To work around
// this we rewrite any `package://` url pointing at a .tiff file into a url which returns a png.
// The x-foxglove-converted-tiff protocol is used because the electron protocol handler for
// package:// uses registerFileProtocol and for converted tiff we need registerBufferProtocol
function rewriteUrl(url: string): string {
  if (url.startsWith("package://") && /\.tiff?$/i.test(url)) {
    return url.replace("package://", "x-foxglove-converted-tiff://");
  }
  return url;
}

function unrewriteUrl(url: string): string {
  if (url.startsWith("x-foxglove-converted-tiff://")) {
    return url.replace("x-foxglove-converted-tiff://", "package://");
  }
  return url;
}

function baseUrl(url: string): string {
  return url.slice(0, url.lastIndexOf("/") + 1);
}
