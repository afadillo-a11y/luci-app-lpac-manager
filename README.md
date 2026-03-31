# LuCI Web Interface for managing eSIM profiles via lpac 2.3.0 (QMI/AT)

## What is this?

**luci-app-lpac-manager** is a LuCI web interface for OpenWrt that provides eSIM profile management through **lpac 2.3.0**.

This variant is specifically adapted for **OpenWrt 24.10.x** and focuses on:

- **native QMI** as the primary LPAC APDU backend
- **AT** as a fallback backend
- modern **lpac 2.3.0** environment variables and runtime behavior
- external eSIM cards installed in a modem SIM/UIM slot, such as **9eSIM** in modules like **T99W175**

This package is intentionally separated from older builds and is published as **`luci-app-epm-qmi`** to distinguish it from earlier `uqmi` / `mbim` oriented variants.

---

## Main features

- View eSIM / eUICC information through `lpac`
- List installed profiles
- Enable / disable / delete profiles
- Download profiles using activation parameters supported by `lpac`
- Configure LPAC backend settings from LuCI
- Use **QMI** as the default backend
- Keep **AT** available as a recovery / fallback path
- Store persistent settings in UCI
- Use a web UI instead of running `lpac` manually from shell

---

## Target use case

This build is primarily intended for:

- **OpenWrt 24.10.x**
- routers or embedded systems using **musl**
- cellular modems exposed as **QMI devices**, typically:
  - `/dev/cdc-wdm0`
- external eSIM cards inserted into the modem SIM slot
- `lpac 2.3.0` builds compiled with:
  - `QMI=ON`
  - `AT=ON`
  - `MBIM=OFF`
  - `QMI_QRTR=OFF`
  - optional `UQMI=OFF`

Typical example:

- external **9eSIM** card inserted into a **T99W175**
- profile management performed through **QMI**
- AT kept only as an emergency fallback

---

## Important notes

### This package is for the QMI/AT branch

This LuCI application is adapted for **lpac 2.3.0** using:

- `LPAC_APDU=qmi` as the default
- `LPAC_APDU_AT_DEVICE` for AT fallback
- `LPAC_APDU_QMI_DEVICE` and `LPAC_APDU_QMI_UIM_SLOT` for QMI access

It does **not** target the older GUI logic based on:

- `uqmi` as the primary backend
- legacy environment variable names
- MBIM-first embedded-eUICC workflows

### MBIM is not the focus of this branch

Some modules expose an **embedded eUICC** only through **MBIM** under Windows or vendor-specific stacks. That is a different scenario.

This branch is intended for **QMI-first operation** and especially for **external eSIM cards in the modem slot**.

### Backend selection

Default backend:
- **QMI**

Fallback backend:
- **AT**

This means the application is optimized for:
- reliable operation on `/dev/cdc-wdm0`
- manual recovery through AT if needed

---

## Requirements

- OpenWrt with LuCI
- `lpac` **2.3.0**
- `libqmi`
- `glib2`
- `libcurl`
- `coreutils-timeout` if required by your build/runtime
- modem with eSIM-capable SIM/UIM access
- internet connection for operations that contact SM-DP+/SM-DS

Recommended environment:
- OpenWrt **24.10.x**
- `lpac` built with native **QMI** support
- QMI device available at `/dev/cdc-wdm0`

---

## Recommended lpac backend configuration

This LuCI app is designed for `lpac 2.3.0` configured around:

- **APDU backend:** `qmi`
- **HTTP backend:** `curl`

Typical defaults:

- `LPAC_APDU=qmi`
- `LPAC_HTTP=curl`
- `LPAC_APDU_QMI_DEVICE=/dev/cdc-wdm0`
- `LPAC_APDU_QMI_UIM_SLOT=1`

AT fallback example:

- `LPAC_APDU=at`
- `LPAC_APDU_AT_DEVICE=/dev/ttyUSB3`

---

## What this app helps you do

- inspect the card / chip information
- work with already installed eSIM profiles
- switch active profiles
- remove unused profiles
- adjust backend-related settings from LuCI
- avoid typing full `lpac` commands manually every time

---

## Package naming

This project uses the package name:

- **`luci-app-lpac-manager`**

The goal is to clearly separate this branch from:
- older `luci-app-epm` builds
- `uqmi`-centric logic
- MBIM-oriented UI assumptions

---

## Installation notes

This package is a **LuCI frontend**.

It does **not** bundle `lpac` itself.

You must install a compatible backend separately, for example:

- `lpac`
- `libqmi`
- `glib2`
- `libcurl`

Make sure your installed `lpac` matches the expected runtime model of this UI:
- native QMI enabled
- AT fallback enabled
- correct wrapper or environment handling on OpenWrt

---

## Compatibility notes

Best suited for:
- external eSIM cards in modem slot
- QMI-capable modem firmware
- `lpac 2.3.0`
- OpenWrt 24.10.x

Not guaranteed for:
- MBIM-only embedded eUICC workflows
- legacy `uqmi`-only integrations
- vendor-specific modem firmware with non-standard UIM access
- desktop Linux distributions outside the intended OpenWrt environment

---

## Contributing

Contributions are welcome.

Useful areas:
- backend detection improvements
- QMI slot handling
- UI/UX improvements
- module compatibility testing
- documentation cleanup
- OpenWrt packaging improvements

### Ways to contribute

1. Open an issue for bugs
2. Submit feature suggestions
3. Send pull requests
4. Improve documentation
5. Share tested modem / eSIM combinations

---

## Acknowledgments

- **[estkme-group](https://github.com/estkme-group/lpac)** for `lpac`
- **[OpenWrt](https://openwrt.org/)** and LuCI developers
- the community members testing eSIM workflows on embedded devices

---
