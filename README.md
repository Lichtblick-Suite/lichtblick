![Accelerate your robotics development](https://user-images.githubusercontent.com/14011012/195918769-5aaeedf3-5de2-48fb-951e-7399f2b9e190.png)

<br/>

<div align="center">
    <h1>Foxbox</h1>
    <a href="https://github.com/foxglove/studio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/foxglove/studio" /></a>
  <br />
  <br />

Foxbox is an integrated visualization and diagnosis tool for robotics, available in your browser or as a desktop app on Linux, Windows, and macOS. Feel free to contribute with our discussions on the <a href="https://ef-mattermost.bmwgroup.net/adp/channels/foxglove-studio">Mattermost Comunitty</a>

  <p align="center">
    <img alt="Foxbox screenshot" src="/resources/screenshot.png">
  </p>
</div>

<hr />
<br />

## Installation

Foxbox is can be ran locally as a web application by using the command (also available on package.json)

```sh
yarn run web:serve
```

Foxbox will be accessible in your browser at [localhost:8080](http://localhost:8080/).
It can also be installed by using the desktop aplication versions available on [github releases](https://github.com/bmw-software-engineering/foxbox/tags).

## Open Source

Foxbox follows an open core licensing model. Most functionality is available in this repository, and can be reproduced or modified per the terms of the [Mozilla Public License v2.0](/LICENSE).

The official binary distributions available at [studio.foxglove.dev](https://studio.foxglove.dev/) or [foxglove.dev/download](https://foxglove.dev/download) incorporate some closed-source functionality, such as integration with [Foxglove Data Platform](https://foxglove.dev/data-platform), multiple layouts, private extensions, and more.

## Contributing

Foxbox is written in TypeScript – contributions are welcome!

Note: All contributors must agree to our [Contributor License Agreement](https://github.com/foxglove/cla). See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Credits

Foxbox originally began as a fork of [FoxGlove Studio](https://github.com/foxglove/studio), an open source project developed by [Foxglove](https://app.foxglove.dev/).
