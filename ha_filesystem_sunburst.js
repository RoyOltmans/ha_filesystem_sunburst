class SunburstChartCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._lastPreparedData = null;
    this._updateInProgress = false;
    this._fetchingData = false;
    this._debounceTimeout = null;
  }

  set hass(hass) {
    if (this._hass !== hass) {
      this._hass = hass;
      if (this._config && this.shadowRoot) {
        if (this.shadowRoot.getElementById("chart")) {
          this._debouncedUpdateChart();
        }
      }
    }
  }

  setConfig(config) {
    if (!config.jsonUrl) {
      throw new Error("You must define 'jsonUrl' for the Sunburst chart.");
    }

    this._config = config;

    if (!window.Plotly) {
      const script = document.createElement("script");
      script.src = "/local/plotly.min.js"; // Use locally hosted Plotly
      script.type = "text/javascript";
      script.onload = () => this._renderChart();
      script.onerror = () => console.error("Failed to load Plotly.js");
      document.head.appendChild(script);
    } else {
      this._renderChart();
    }
  }

  async _renderChart() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .sunburst-container {
		  background: var(--ha-card-background, var(--card-background-color, #fff));
  		  backdrop-filter: none; /* Ensure no transparent blur effect */
  		  box-shadow: none; /* Remove unwanted glow */
  		  box-sizing: border-box;
  		  border-radius: var(--ha-card-border-radius,12px);
		  border-width: var(--ha-card-border-width,1px);
		  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
  		  color: var(--primary-text-color);
  		  display: block;
  		  transition: all 0.3s ease-out;
  		  position: relative;
		  border-style: solid;
        }
        #chart {
          flex: 1;
          max-width: 100%;
          max-height: 100%;
          margin: 10px;
        }

        .version-label {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 12px;
          color: #888;
          font-family: Arial, sans-serif;
          opacity: 0.8;
          background: rgba(255, 255, 255, 0.7);
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
        }
      </style>
      <div class="sunburst-container">
        <div id="chart"></div>
        <div class="version-label">Version 0.2.3</div>
      </div>
    `;

    const chartContainer = this.shadowRoot.getElementById("chart");
    const data = await this._prepareData();

    if (data && data.length > 0) {
      const layout = {
        margin: { t: 0, l: 0, r: 0, b: 0 },
        uniformtext: { minsize: 10, mode: "hide" },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        transition: {
          duration: 200, // Faster animations
          easing: "cubic-in-out",
        },
      };

      const config = {
        staticPlot: false,
        scrollZoom: true,
        editable: true,
      };

      Plotly.newPlot(chartContainer, data, layout, config);
    } else {
      console.error("Sunburst chart data is empty or invalid.");
    }
  }

  async _updateChart() {
    if (this._updateInProgress) {
      console.log("Update skipped: another update in progress.");
      return;
    }
    this._updateInProgress = true;
    try {
      const chartContainer = this.shadowRoot.getElementById("chart");
      if (chartContainer) {
        const newData = await this._prepareData();
        if (!newData || newData.length === 0) {
          throw new Error("No data available for chart update.");
        }
        const layout = {
          margin: { t: 0, l: 0, r: 0, b: 0 },
          uniformtext: { minsize: 10, mode: "hide" },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          transition: {
            duration: 200,
            easing: "cubic-in-out",
          },
        };
        Plotly.react(chartContainer, newData, layout);
      }
    } catch (error) {
      console.error("Error during chart update:", error);
    } finally {
      this._updateInProgress = false;
    }
  }

  _debouncedUpdateChart() {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
    this._debounceTimeout = setTimeout(() => this._updateChart(), 300);
  }

  async _prepareData() {
    if (!this._lastPreparedData || this._fetchingData) {
      this._fetchingData = true;
      try {
        const response = await fetch(this._config.jsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch JSON data: ${response.statusText}`);
        }
        const jsonData = await response.json();

        const processedData = { labels: [], parents: [], values: [] };

        if (!jsonData.labels || !jsonData.parents || !jsonData.values) {
          throw new Error("Invalid JSON data structure: missing keys.");
        }

        const uniqueLabels = new Set();
        jsonData.labels.forEach((label, index) => {
          if (jsonData.values[index] > 5000) {
            let uniqueLabel = label;

            let counter = 1;
            while (uniqueLabels.has(uniqueLabel)) {
              uniqueLabel = `${label}_${counter}`;
              counter++;
            }

            uniqueLabels.add(uniqueLabel);
            processedData.labels.push(uniqueLabel);
            processedData.parents.push(jsonData.parents[index]);

            // Convert size to MB for rendering
            const sizeInMB = jsonData.values[index] / 1e6;
            processedData.values.push(sizeInMB);
          }
        });

        this._lastPreparedData = [
          {
            type: "sunburst",
            labels: processedData.labels,
            parents: processedData.parents,
            values: processedData.values,
            branchvalues: "total",
            textinfo: "label+percent", // Use percentage only in text info
            hovertemplate: "<b>%{label}</b><br>Size: %{value:.2f} MB<extra></extra>", // Show size in MB on hover
            insidetextorientation: "horizontal",
            maxdepth: 4,
            marker: {
              line: {
                width: 0.5, // Thinner border
                color: "#ffffff", // White border color
              },
            },
          },
        ];
      } catch (error) {
        console.error("Error fetching or processing Sunburst chart data:", error);
        this._lastPreparedData = [];
      } finally {
        this._fetchingData = false;
      }
    }
    return this._lastPreparedData;
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("sunburst-chart-card", SunburstChartCard);

// Version 0.0.3: Updated to use locally hosted Plotly library to ensure compatibility with mobile apps.
// Version 0.0.4: Addressed floating labels by adding uniformtext and auto text orientation.
// Version 0.0.5: Improved text display with percentages and refined label alignment.
// Version 0.0.6: Removed all text labels to resolve floating label issues.
// Version 0.0.7: Merged animations, text alignment, and reactive updates with persistent data.
// Version 0.1.0: Incremented version to reflect stable updates and label improvements.
// Version 0.1.1: Fixed root value calculation to avoid warnings when the total does not match the sum of children.
// Version 0.1.2: Added automatic adjustment of parent values to ensure consistency with "branchvalues: total".
// Version 0.1.3: Optimized parent value calculation and improved efficiency for large datasets.
// Version 0.1.4: Filtered data to include only directories in the Sunburst chart.
// Version 0.1.5: Added support for multi-level folder structures with interactive subfolder navigation.
// Version 0.1.6: Added throttling and validation to ensure updates do not overlap and prevent data errors.
// Version 0.1.7: Improved label uniqueness handling and added debugging for JSON processing.
// Version 0.1.8: Added filtering for small values and improved data preparation performance.
// Version 0.1.9: Optimized animations, reduced data granularity, and improved overall rendering speed.
// Version 0.2.0: Added debouncing for updates, faster transitions, and streamlined data preparation.
// Version 0.2.1: Adjusted layout for transparent background and white borders in chart visualization.
// Version 0.2.2: Added thicker white borders to improve chart visibility.
// Version 0.2.3: Converted size values to MB for rendering and adjusted hovertemplate for better display.
// Version 0.2.4: Fixed following HA styling, transparancy, dark and light theme's
