declare module "text-width" {
  export type Options = {
    family: string;
    size: number;
  };
  export default function (text: string, opt: Options): number;
}
