## Building from Source

This project supports building browser extension packages for both **Chrome (Manifest V3)** and **Firefox (Manifest V2)**.

### Prerequisites

* [Node.js](https://nodejs.org/) (LTS recommended)
* npm (comes with Node.js)

To verify installation:

```bash
node -v
npm -v
```

---

### Install Dependencies

From the root directory:

```bash
npm install
```

*Note: If there are no dependencies listed in `package.json`, this step is optional.*

---

### Build the Extension

To build the extension for both browsers:

```bash
npm install
node build.js
```

This script:

* Copies all files from `app/` into the `distro/` directory
* Applies the correct manifest version for each browser:

  * Chrome → `distro/chrome/manifest.json` (uses `manifest.v3.json`)
  * Firefox → `distro/firefox/manifest.json` (uses `manifest.v2.json`)

---


### Load the Extension

#### Option 1: From Source

**Chrome**:

1. Navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `distro/chrome/` folder

**Firefox**:

1. Navigate to `about:debugging`
2. Click **This Firefox**
3. Click **Load Temporary Add-on**
4. Select the `distro/firefox/manifest.json` file

---

#### Option 2: From Prebuilt ZIP (Recommended for Testing)

You can also download prebuilt versions from the [latest GitHub Release](https://github.com/jacobtender/marian-extension/releases/latest). Look for files named:

- `<repo>-chrome<version>.zip`
- `<repo>-firefox<version>.zip`

**Steps**:

1. Download and extract the `.zip` file for your browser.
2. Follow the same steps as **Option 1**, but select the extracted folder instead of `distro/`.

> ⚠️ Extensions loaded this way are not auto-updated. You will need to repeat the steps for future versions.
