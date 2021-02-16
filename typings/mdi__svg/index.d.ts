/// <reference types="react" />

declare module "*.svg" {
  const IconComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default IconComponent;
}
