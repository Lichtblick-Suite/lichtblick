// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PinholeCameraModel } from "@lichtblick/den/image";
import { RosObject } from "@lichtblick/suite-base/players/types";
import * as THREE from "three";

import { LabelPool } from "@foxglove/three-text";

import { RenderableLineAnnotation } from "./RenderableLineAnnotation";
import { RenderablePointsAnnotation } from "./RenderablePointsAnnotation";
import { RenderableTextAnnotation } from "./RenderableTextAnnotation";
import { Annotation as NormalizedAnnotation } from "./types";

/**
 * Holds renderables for all the 2D image annotations on a single topic.
 */
export class RenderableTopicAnnotations extends THREE.Object3D {
  #labelPool: LabelPool;
  #points: RenderablePointsAnnotation[] = [];
  #lines: RenderableLineAnnotation[] = [];
  #texts: RenderableTextAnnotation[] = [];

  #scale = 0;
  #canvasWidth = 0;
  #canvasHeight = 0;
  #pixelRatio = 0;
  #scaleNeedsUpdate = false;

  #annotations: NormalizedAnnotation[] = [];
  #annotationsNeedsUpdate = false;

  #cameraModel?: PinholeCameraModel;
  #cameraModelNeedsUpdate = false;

  #originalMessage?: RosObject;
  #topicName: string;

  public constructor(topicName: string, labelPool: LabelPool) {
    super();
    this.#labelPool = labelPool;
    this.#topicName = topicName;
  }

  public dispose(): void {
    for (const points of this.#points) {
      points.dispose();
    }
    for (const lineList of this.#lines) {
      lineList.dispose();
    }
  }

  public setScale(
    scale: number,
    canvasWidth: number,
    canvasHeight: number,
    pixelRatio: number,
  ): void {
    this.#scaleNeedsUpdate ||= this.#scale !== scale;
    this.#scale = scale;
    this.#canvasWidth = canvasWidth;
    this.#canvasHeight = canvasHeight;
    this.#pixelRatio = pixelRatio;
  }

  public setOriginalMessage(originalMessage: RosObject | undefined): void {
    this.#originalMessage = originalMessage;
  }

  public setCameraModel(cameraModel: PinholeCameraModel | undefined): void {
    this.#cameraModelNeedsUpdate ||= this.#cameraModel !== cameraModel;
    this.#cameraModel = cameraModel;
  }

  public setAnnotations(annotations: NormalizedAnnotation[]): void {
    this.#annotationsNeedsUpdate ||= this.#annotations !== annotations;
    this.#annotations = annotations;
  }

  public update(): void {
    if (this.#scaleNeedsUpdate) {
      this.#scaleNeedsUpdate = false;
      for (const points of this.#points) {
        points.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
      }
      for (const lineList of this.#lines) {
        lineList.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
      }
      for (const text of this.#texts) {
        text.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
      }
    }

    if (this.#cameraModelNeedsUpdate) {
      this.#cameraModelNeedsUpdate = false;
      for (const points of this.#points) {
        points.setCameraModel(this.#cameraModel);
      }
      for (const lineList of this.#lines) {
        lineList.setCameraModel(this.#cameraModel);
      }
      for (const text of this.#texts) {
        text.setCameraModel(this.#cameraModel);
      }
    }

    const updateRenderables = () => {
      for (const points of this.#points) {
        points.update();
      }
      for (const lineList of this.#lines) {
        lineList.update();
      }
      for (const text of this.#texts) {
        text.update();
      }
    };

    if (!this.#annotationsNeedsUpdate) {
      updateRenderables();
      return;
    }

    this.#annotationsNeedsUpdate = false;

    // Reverse arrays so renderables are more likely to be reused for similarly-structured
    // annotations when using pop() below.
    const unusedPoints = this.#points.reverse();
    this.#points = [];
    const unusedLines = this.#lines.reverse();
    this.#lines = [];
    const unusedTexts = this.#texts.reverse();
    this.#texts = [];

    for (const annotation of this.#annotations) {
      switch (annotation.type) {
        case "circle": {
          let line = unusedLines.pop();
          if (!line) {
            line = new RenderableLineAnnotation(this.#topicName);
            line.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
            line.setCameraModel(this.#cameraModel);
            this.add(line);
          }
          this.#lines.push(line);
          line.setAnnotationFromCircle(annotation, this.#originalMessage);
          break;
        }

        case "points":
          switch (annotation.style) {
            case "points": {
              let points = unusedPoints.pop();
              if (!points) {
                points = new RenderablePointsAnnotation(this.#topicName);
                points.setScale(
                  this.#scale,
                  this.#canvasWidth,
                  this.#canvasHeight,
                  this.#pixelRatio,
                );
                points.setCameraModel(this.#cameraModel);
                this.add(points);
              }
              this.#points.push(points);
              points.setAnnotation(
                annotation as typeof annotation & { style: typeof annotation.style },
                this.#originalMessage,
              );
              break;
            }

            case "polygon":
            case "line_strip":
            case "line_list": {
              let line = unusedLines.pop();
              if (!line) {
                line = new RenderableLineAnnotation(this.#topicName);
                line.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
                line.setCameraModel(this.#cameraModel);
                this.add(line);
              }
              this.#lines.push(line);
              line.setAnnotation(
                annotation as typeof annotation & { style: typeof annotation.style },
                this.#originalMessage,
              );
              break;
            }
          }
          break;

        case "text": {
          let text = unusedTexts.pop();
          if (!text) {
            text = new RenderableTextAnnotation(this.#topicName, this.#labelPool);
            text.setScale(this.#scale, this.#canvasWidth, this.#canvasHeight, this.#pixelRatio);
            text.setCameraModel(this.#cameraModel);
            this.add(text);
          }
          this.#texts.push(text);
          text.setAnnotation(annotation, this.#originalMessage);
          break;
        }
      }
    }

    updateRenderables();

    for (const points of unusedPoints) {
      points.removeFromParent();
      points.dispose();
    }
    for (const lineList of unusedLines) {
      lineList.removeFromParent();
      lineList.dispose();
    }
    for (const text of unusedTexts) {
      text.removeFromParent();
      text.dispose();
    }
  }
}
