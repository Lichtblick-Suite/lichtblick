declare module "rosbag" {
  type RosMsgField = {
    type: string;
    name: string;
    isComplex?: boolean;

    // For arrays
    isArray?: boolean;
    arrayLength?: number | null | undefined;

    // For constants
    isConstant?: boolean;
    value?: unknown;
  };

  interface Time {
    // whole seconds
    sec: number;
    // additional nanoseconds past the sec value
    nsec: number;
  }

  export type { RosMsgField, Time };
}
