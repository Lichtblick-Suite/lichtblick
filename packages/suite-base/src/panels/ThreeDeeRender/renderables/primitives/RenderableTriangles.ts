// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { DynamicBufferGeometry } from "@lichtblick/suite-base/panels/ThreeDeeRender/DynamicBufferGeometry";
import * as THREE from "three";

import { toNanoSec } from "@foxglove/rostime";
import { Point3, SceneEntity, TriangleListPrimitive } from "@foxglove/schemas";

import { RenderablePrimitive } from "./RenderablePrimitive";
import type { IRenderer } from "../../IRenderer";
import { makeRgba, rgbToThreeColor, SRGBToLinear, stringToRgba } from "../../color";
import { LayerSettingsEntity } from "../../settings";

const tempRgba = makeRgba();
const tempColor = new THREE.Color();
const missingColor = { r: 0, g: 1.0, b: 0, a: 1.0 };

const COLOR_LENGTH_ERROR_ID = "INVALID_COLOR_LENGTH";
const INVALID_POINT_ERROR_ID = "INVALID_POINT";

type TriangleMesh = THREE.Mesh<DynamicBufferGeometry, THREE.MeshStandardMaterial>;
export class RenderableTriangles extends RenderablePrimitive {
  #triangleMeshes: TriangleMesh[] = [];
  public constructor(renderer: IRenderer) {
    super("", renderer);
  }

  #ensureCapacity(triCount: number) {
    while (triCount > this.#triangleMeshes.length) {
      this.#triangleMeshes.push(makeTriangleMesh());
    }
  }
  #updateTriangleMeshes(tris: TriangleListPrimitive[]) {
    this.#ensureCapacity(tris.length);
    // removes all children so that meshes that are still in the _triangleMesh array
    // but don't have a new corresponding primitive  won't be rendered
    this.clear();

    let triMeshIdx = 0;
    for (const primitive of tris) {
      const mesh = this.#triangleMeshes[triMeshIdx];
      if (!mesh) {
        continue;
      }
      const { geometry, material } = mesh;
      let transparent = false;

      let vertChanged = false;
      let colorChanged = false;

      // note this sets the drawrange to the count
      // we set the drawrange again for indexed geometries below
      geometry.resize(primitive.points.length);

      if (!geometry.attributes.position) {
        geometry.createAttribute("position", Float32Array, 3);
      }
      if (!geometry.attributes.normal) {
        geometry.createAttribute("normal", Float32Array, 3);
      }
      const vertices = geometry.attributes.position!;

      const singleColor = this.userData.settings.color
        ? stringToRgba(tempRgba, this.userData.settings.color)
        : primitive.colors.length === 0
          ? primitive.color
          : undefined;

      if (!singleColor && !geometry.attributes.color) {
        geometry.createAttribute("color", Uint8Array, 4, true);
      }
      const colors = geometry.attributes.color;

      for (let i = 0; i < primitive.points.length; i++) {
        const point = primitive.points[i]!;
        if (!isPointValid(point)) {
          this.addError(
            `${this.name}-${INVALID_POINT_ERROR_ID}`,
            `Entity: ${this.userData.entity?.id}.triangles[${triMeshIdx}](1st index) - Point definition at index ${i} is not finite`,
          );
          continue;
        }
        vertChanged =
          vertChanged ||
          vertices.getX(i) !== point.x ||
          vertices.getY(i) !== point.y ||
          vertices.getZ(i) !== point.z;
        vertices.setXYZ(i, point.x, point.y, point.z);

        if (!singleColor && colors && primitive.colors.length > 0) {
          const color = primitive.colors[i] ?? missingColor;
          // only trigger on last point index
          if (i === primitive.points.length - 1 && color === missingColor) {
            // will only show 1st triMeshIdx of issue -- addError prevents the adding of errors with duplicate errorIds
            this.addError(
              `${this.name}-${COLOR_LENGTH_ERROR_ID}`,
              `Entity: ${this.userData.entity?.id}.triangles[${triMeshIdx}](1st index) - Colors array should be same size as points array, showing #00ff00 instead`,
            );
          }
          const r = SRGBToLinear(color.r);
          const g = SRGBToLinear(color.g);
          const b = SRGBToLinear(color.b);
          const a = color.a;
          colorChanged =
            colorChanged ||
            colors.getX(i) !== r ||
            colors.getY(i) !== g ||
            colors.getZ(i) !== b ||
            colors.getW(i) !== a;
          colors.setXYZW(i, r, g, b, a);
          if (!transparent && a < 1.0) {
            transparent = true;
          }
        }
      }
      if (vertChanged) {
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.attributes.position!.needsUpdate = true;
      }
      if (colorChanged) {
        geometry.attributes.color!.needsUpdate = true;
      }

      // covers the case where a geometry went from being defined by a single
      // color to vertex colors but there was no difference in the vertex
      // colors that already existed and the new ones we can tell this by
      // checking the current vertexColors of the material, if false ->
      // previously singleColor
      const vertexColorChanged =
        !material.vertexColors && !singleColor && primitive.colors.length > 0;
      if (vertexColorChanged) {
        material.vertexColors = true;
        // need to set overall material color back or else it will blend them with the vertex colors
        material.color.setRGB(1, 1, 1);
        material.opacity = 1.0;
        // can assume that color exists since colorchanged is true
        geometry.attributes.color!.needsUpdate = true;
        material.needsUpdate = true;
      } else if (singleColor) {
        transparent = singleColor.a < 1.0;
        const newColor = rgbToThreeColor(tempColor, singleColor);
        const materialNeedsUpdate =
          material.vertexColors ||
          !material.color.equals(newColor) ||
          mesh.material.opacity !== singleColor.a;
        if (materialNeedsUpdate) {
          material.vertexColors = false;
          material.color.copy(tempColor);
          mesh.material.opacity = singleColor.a;
          material.needsUpdate = true;
        }
      }

      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.depthWrite = !transparent;
        material.needsUpdate = true;
      }

      const indices = primitive.indices;
      if (indices.length > 0) {
        if (!geometry.index || geometry.index.count < indices.length) {
          const array = new Uint32Array(Math.round(indices.length * 1.5) + 16);
          array.set(indices);
          geometry.index = new THREE.BufferAttribute(array, 1);
        } else {
          const array = geometry.index.array as Uint32Array;
          let needsUpdate = false;
          for (let i = 0; i < indices.length; i++) {
            if (array[i] !== indices[i]) {
              array[i] = indices[i]!;
              needsUpdate = true;
            }
          }
          geometry.index.needsUpdate = needsUpdate;
        }

        // this is set in `geometry.resize` to itemCount
        // which works for non-indexed geometries but not for indexed geoms
        geometry.setDrawRange(0, indices.length);
      } else {
        // eslint-disable-next-line no-restricted-syntax
        geometry.index = null;
      }

      mesh.position.set(
        primitive.pose.position.x,
        primitive.pose.position.y,
        primitive.pose.position.z,
      );
      mesh.quaternion.set(
        primitive.pose.orientation.x,
        primitive.pose.orientation.y,
        primitive.pose.orientation.z,
        primitive.pose.orientation.w,
      );
      this.add(mesh);
      triMeshIdx++;
    }
  }

  public override dispose(): void {
    for (const mesh of this.#triangleMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.clear();
    this.#triangleMeshes.length = 0;
    this.clearErrors();
  }

  public override update(
    topic: string | undefined,
    entity: SceneEntity | undefined,
    settings: LayerSettingsEntity,
    receiveTime: bigint,
  ): void {
    super.update(topic, entity, settings, receiveTime);
    if (entity) {
      const lifetimeNs = toNanoSec(entity.lifetime);
      this.userData.expiresAt = lifetimeNs === 0n ? undefined : receiveTime + lifetimeNs;
      this.#updateTriangleMeshes(entity.triangles);
    }
  }

  public updateSettings(settings: LayerSettingsEntity): void {
    this.update(this.userData.topic, this.userData.entity, settings, this.userData.receiveTime);
  }
}

function makeTriangleMesh(): TriangleMesh {
  return new THREE.Mesh(
    new DynamicBufferGeometry(),
    new THREE.MeshStandardMaterial({
      metalness: 0,
      roughness: 1,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
}

function isPointValid(pt: Point3): boolean {
  return Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z);
}
