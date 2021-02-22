declare module "regl-worldview" {
  export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
  }

  class PolygonBuilder {
    polygons: any;
    onChange: any;

    constructor(polygons?: Polygon[]);
  }

  interface CommonCommandProps {
    layerIndex?: any;
  }

  interface ReglClickInfo {
    ray: any;
  }

  interface Arrow {
    pose: any;
    scale: any;
    color: any;
    settings: any;
    interactionData: any;
  }

  function pointToVec3(arg: any): any;
  function orientationToVec4(arg: any): any;
  function vec3ToPoint(arg: any): any;
  function withPose(arg: any): any;
  function parseGLB(arg: any): any;
  function vec4ToRGBA(arg: any): any;
  function toRGBA(arg: any): any;
  function nonInstancedGetChildrenForHitmap(arg: any): any;
  function getChildrenForHitmapWithOriginalMarker(arg0: any, arg1: any, arg2: any): any;
  function shouldConvert(arg: any): any;

  // jsx elements
  const FilledPolygons: any;
  const Arrows: any;
  const Worldview: any;
  const Command: any;
  const GLTFScene: any;
  const Triangles: any;
  const Lines: any;
  const DrawPolygons: any;

  class Polygon {
    points: any;
    constructor(arg: any);
  }
  class PolygonPoint {
    constructor(arg: any);
  }

  type MouseEventObject = any;
  type CameraState = any;
  type CameraStateSelectors = any;
  type Scale = any;
  type Pose = any;
  type Regl = any;
  type AssignNextColorsFn = any;
  type Line = any;
  type TriangleList = any;
  type MouseHandler = any;

  // vars
  const DEFAULT_CAMERA_STATE: any;
  const defaultBlend: any;
  const cameraStateSelectors: CameraStateSelectors;

  export {
    DEFAULT_CAMERA_STATE,
    Scale,
    Pose,
    Command,
    Polygon,
    PolygonBuilder,
    ReglClickInfo,
    CommonCommandProps,
    Arrow,
    Arrows,
    FilledPolygons,
    pointToVec3,
    vec3ToPoint,
    orientationToVec4,
    Worldview,
    withPose,
    parseGLB,
    defaultBlend,
    cameraStateSelectors,
    CameraStateSelectors,
    CameraState,
    MouseEventObject,
    GLTFScene,
    vec4ToRGBA,
    Regl,
    AssignNextColorsFn,
    nonInstancedGetChildrenForHitmap,
    getChildrenForHitmapWithOriginalMarker,
    toRGBA,
    Triangles,
    Lines,
    Line,
    TriangleList,
    shouldConvert,
    PolygonPoint,
    DrawPolygons,
    MouseHandler,
    Cubes,
    Cylinders,
    GLText,
    Points,
    Spheres,
    Overlay,
    createInstancedGetChildrenForHitmap,
    Vec3,
    Vec4,
    WorldviewContextType,
    WorldviewReactContext,
    Point,
  };
}
