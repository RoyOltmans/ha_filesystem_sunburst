# Filesystem Sunburst Visualization for Home Assistant

## Overview
This project integrates a Sunburst chart into Home Assistant using Plotly and a custom `sunburst-chart-card.js` file. It visualizes hierarchical filesystem data, fetched as JSON from a Python script, and renders it as an interactive chart in your Home Assistant dashboard.

![preview](/images/filesystem_sunburst.png)

## Features
- **Interactive Sunburst Chart**: Dynamically generated with Plotly.
- **Filesystem Data Visualization**: Hierarchical data displayed in a user-friendly format.
- **Customizable**: Configuration through Home Assistant YAML and external Python scripts.
- **Performance and Safety**: Data separation between frontend and backend for enhanced performance and security.

## Installation Guide

### Prerequisites
1. Home Assistant installed and running (untested but should be compatible with HA OS,	Core en Supervised, tested with HA Core Container)
2. Local access to your Home Assistant configuration directory.
3. Python 3.7+ installed on the host system.

### Step 1: Download Dependencies
Download the Plotly library and place it in the Home Assistant `www` directory. This is required to render the Sunburst chart in the frontend. Use the following commands:
```bash
mkdir -p /config/www
wget https://cdn.plot.ly/plotly-2.24.1.min.js -O /config/www/plotly.min.js
```

### Step 2: Install the Sunburst Chart Card
Place the `sunburst-chart-card.js` file in the `www` directory of your Home Assistant configuration. Add the card as a resource in your `configuration.yaml`:
```bash
cp sunburst-chart-card.js /config/www/sunburst-chart-card.js
```
Add the following entry to your configuration:
```yaml
lovelace:
  resources:
    - url: /local/sunburst-chart-card.js
      type: module
```
Restart Home Assistant to apply the changes.

### Step 3: Configure the Card
In your Home Assistant Lovelace dashboard, add a new card using the following configuration:
```yaml
type: custom:sunburst-chart-card
jsonUrl: /local/filesystem_data.json
```
This configuration points the card to the JSON file generated by the backend script.

### Step 4: Generate Filesystem Data
Save the `filesystem_scanner.py` script to a directory on your server. This script scans your filesystem and outputs a JSON file compatible with the Sunburst chart. Place the script in a secure location, such as `/opt/scripts/filesystem_scanner.py`, and run it using:
```bash
python3 /opt/scripts/filesystem_scanner.py
```
Ensure the output file is saved to `/config/www/filesystem_data.json` so it can be accessed by the Sunburst card.

### Step 5: Automate with Crontab
To keep the filesystem data up-to-date, schedule the script to run periodically using `crontab`. Open the crontab editor:
```bash
crontab -e
```
Add a line to run the script every hour:
```bash
0 * * * * /usr/bin/python3 /opt/scripts/filesystem_scanner.py
```
This ensures the JSON data remains current without manual intervention.

## Separation of Concerns
The Sunburst chart card is designed with a clear separation of responsibilities between the frontend and backend to ensure performance and security:

The **frontend** is responsible for rendering the chart and displaying it interactively in the Home Assistant dashboard. It fetches the preprocessed data as a JSON file from the backend and does not access the filesystem directly. This design keeps the frontend lightweight and ensures no sensitive filesystem data is exposed through direct access.

The **backend** is responsible for generating and preprocessing the filesystem data into a JSON format suitable for the chart. This involves scanning the filesystem, calculating folder sizes, and building the hierarchical data structure. By running this process in a secure and isolated environment, the backend ensures sensitive operations are handled safely. Additionally, offloading heavy computations to the backend prevents performance issues in the frontend.

## Configuration Details
The `config.json` file allows you to customize various aspects of the script's behavior. Place this file in the same directory as the `filesystem_scanner.py` script. An example configuration is shown below:
```json
{
    "output_file": "/config/www/filesystem_data.json",
    "error_log_file": "/opt/filesystem/error_log.txt",
    "exclude_dirs": ["/var", "/proc", "/sys", "/dev", "/mnt"],
    "max_depth": 5
}
```
- **`output_file`**: The location where the JSON output will be saved. Ensure this path is accessible to the Home Assistant frontend via /local/ refered in the sunburst.
- **`error_log_file`**: The file where errors and warnings are logged during the scan.
- **`exclude_dirs`**: A list of directories to exclude from the scan. This helps avoid unnecessary processing of system-critical or irrelevant paths.
- **`max_depth`**: Limits the depth of the folder hierarchy to prevent excessive data generation and improve performance.

## Disclaimer
This project uses Plotly.js, which is subject to the [Plotly license](https://plotly.com/javascript/is-plotly-free/). You must comply with the terms of this license when using Plotly.js in your projects.

The Sunburst Chart Card itself and the associated Python script are distributed under the MIT License. While every effort has been made to ensure the safety and security of this code, you use it at your own risk. Configure the script and card securely to avoid exposing sensitive data. Performance may vary depending on the size and structure of your filesystem.

## License
This project is licensed under the MIT License. See `LICENSE` for details.

