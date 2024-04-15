import { FieldReader, getReader } from "./readers";
import { Header } from "./types";

interface sensor_msgs__PointField {
  name: string;
  offset: number;
  datatype: number;
  count: number;
}

export interface sensor_msgs__PointCloud2 {
  header: Header;
  height: number;
  width: number;
  fields: sensor_msgs__PointField[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: Uint8Array;
  is_dense: boolean;
}

type Reader = { datatype: number; offset: number; reader: FieldReader };

function getFieldOffsetsAndReaders(fields: sensor_msgs__PointField[]): Reader[] {
  const result: Reader[] = [];
  for (const { datatype, offset = 0 } of fields) {
    result.push({ datatype, offset, reader: getReader(datatype, offset) });
  }
  return result;
}

type Field = number | string;

/**
 * Read points from a sensor_msgs.PointCloud2 message. Returns a nested array
 * of values whose index corresponds to that of the 'fields' value.
 */
export const readPoints = (message: sensor_msgs__PointCloud2): Array<Field[]> => {
  const { fields, height, point_step, row_step, width, data } = message;
  const readers = getFieldOffsetsAndReaders(fields);

  const points: Array<Field[]> = [];
  for (let i = 0; i < height; i++) {
    const dataOffset = i * row_step;
    for (let j = 0; j < width; j++) {
      const row: Field[] = [];
      const dataStart = j * point_step + dataOffset;
      for (const reader of readers) {
        const value = reader.reader.read(data, dataStart);
        row.push(value);
      }
      points.push(row);
    }
  }
  return points;
};
