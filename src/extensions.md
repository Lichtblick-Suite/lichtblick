# Introduction

Enhance Lichtblick's functionality with custom extensions tailored to your team's specific workflows. Create personalized panels, transform custom messages into Lichtblick-compatible schemas, and map topic names for improved visualization.

After developing and installing your extension, navigate to your app settings to view all available and installed extensions.

## Settings API
The Panel Settings API allows users to link settings to message converters based on panel types.

## PanelSettings Interface

The `PanelSettings<ExtensionSettings>` interface defines the structure for managing custom settings associated with message converters and panels. It allows users to define settings that can be dynamically applied to specific topics or schemas, enabling flexible configuration of message processing behavior.

#### Generic Type Parameter

* `ExtensionSettings`: Represents the type of the custom settings object. This is user-defined and should match the structure of the settings you want to configure.


#### Properties

1. `settings`

```typescript
settings: (config?: ExtensionSettings) => SettingsTreeNode;
```

* **Purpose**: Defines how the settings should be rendered in the settings UI.
* **Parameters:**
    * `config`: An optional object containing the current configuration values. Its type is inferred from the `defaultConfig` property.

* **Returns:** A `SettingsTreeNode` that describes the structure of the settings UI. This node will be merged with the settings tree for the associated topic (under the path `["topics", "__topic_name__"]`).

* **Example:**
```typescript
settings: (config) => ({
  fields: {
    threshold: {
      input: "number",
      value: config?.threshold,
      label: "Threshold Value",
    },
  },
}),
```
---
2. `handler`

```typescript
handler: (action: SettingsTreeAction, config?: ExtensionSettings) => void;
```

* **Purpose**: Handles changes to the settings made by the user in the UI.
* **Parameters:**
    * `action`:  A `SettingsTreeAction` object describing the user's action (e.g., updating a field).
    * `config`: A mutable object representing the current configuration. Modifying this object updates the state.

* **Behavior:**
    * This function is called after the default settings handler.
    * It allows you to validate or transform the settings before they are applied.

* **Example:**
```typescript
handler: (action, config) => {
  if (action.action === "update" && action.payload.path[1] === "threshold") {
    // Ensure threshold is within valid range
    config.threshold = Math.max(0, Math.min(1, action.payload.value));
  }
},
```

---
3. `defaultConfig`

```typescript
defaultConfig?: ExtensionSettings;
```

* **Purpose:** Provides default values for the settings. These values are used when no configuration is explicitly set.
* **Type:** Must match the `ExtensionSettings` type.

* **Example:**
```typescript
defaultConfig: {
  threshold: 0.5,
  enableFeature: true,
},
```
---

#### Expected Behavior
When implementing this interface:
1. **Settings UI:** The `settings` function defines how the settings are displayed in the UI. It creates a settings tree node that is merged into the topic's settings.
2. **Configuration Management:** The `handler` function processes user interactions with the settings UI, allowing you to validate or transform the configuration.
3. **Defaults:** The `defaultConfig` provides initial values for the settings, ensuring the panel or converter has a valid configuration even if the user hasn't customized it.

#### Possible Outcomes
1. **Dynamic Settings UI:**
    *  The `settings` defined in the settings function will appear in the UI under the associated topic.
    * Users can modify these settings, and changes will be handled by the `handler` function.

2. **Custom Configuration:**
    * The `handler` function allows you to enforce constraints or transform values before they are applied.
    * For example, you can ensure a threshold value stays within a valid range.

3. **Default Behavior:**
    * If no custom configuration is provided, the `defaultConfig` values are used.
    * This ensures the panel or converter works out of the box without requiring user input.

---
### Example Implementation:


```typescript
interface MyPanelSettings {
  threshold: number;
  enableFeature: boolean;
}

const myPanelSettings: PanelSettings<MyPanelSettings> = {
  settings: (config) => ({
    fields: {
      threshold: {
        input: "number",
        value: config?.threshold,
        label: "Threshold Value",
      },
      enableFeature: {
        input: "boolean",
        value: config?.enableFeature,
        label: "Enable Feature",
      },
    },
  }),

  handler: (action, config) => {
    if (action.action === "update") {
      if (action.payload.path[1] === "threshold") {
        // Ensure threshold is between 0 and 1
        config.threshold = Math.max(0, Math.min(1, action.payload.value));
      } else if (action.payload.path[1] === "enableFeature") {
        config.enableFeature = action.payload.value;
      }
    }
  },

  defaultConfig: {
    threshold: 0.5,
    enableFeature: true,
  },
};
```

#### Use Case
This interface is typically used when registering a message converter:
```typescript
ctx.registerMessageConverter({
  fromSchemaName: "schema1",
  toSchemaName: "schema2",
  converter: (msg) => transformMessage(msg),
  panelSettings: {
    MyPanel: myPanelSettings,
  },
});
```

---
### Summary
The `PanelSettings<ExtensionSettings>` interface provides a structured way to:
1. Define custom settings for panels or message converters.
2. Render these settings in the UI.
3. Handle user interactions with the settings.
4. Provide default values for the settings.

By implementing this interface, you enable users to configure your panel or converter dynamically, making it more flexible and adaptable to different use cases.