// GeoServer API Manager
// Handles all WFS/WMS requests to GeoServer with authentication

class GeoServerAPI {
  constructor() {
    this.GEOSERVER_URL = "http://localhost:8080/geoserver";
    this.HOSPITAL_WORKSPACE = "hospital_ws";
    this.HOSPITAL_LAYER = "hospital_ws:hospitals";
  }

  /**
   * Fetch hospitals from GeoServer WFS
   * @param {Object} filter - Optional filter {name, district}
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async fetchHospitals(filter = null) {
    try {
      let url;
      let options = {
        method: "GET",
        credentials: "include",
      };

      if (filter && (filter.name || filter.district)) {
        // Use POST with filter
        url = `${this.GEOSERVER_URL}/${this.HOSPITAL_WORKSPACE}/ows`;
        const xml = this.buildGetFeatureXml(filter);
        options = {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/xml",
          },
          body: xml,
        };
      } else {
        // Simple GET request
        url = `${this.GEOSERVER_URL}/${this.HOSPITAL_WORKSPACE}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${this.HOSPITAL_LAYER}&outputFormat=application/json`;
      }

      const response = await fetch(url, options);

      if (response.status === 401 || response.status === 404) {
        // Not authenticated - show login modal
        if (typeof authManager !== "undefined") {
          authManager.showLoginRequired();
        }
        throw new Error("Authentication required");
      }

      if (!response.ok) {
        throw new Error(`GeoServer error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      throw error;
    }
  }

  /**
   * Insert a new hospital feature via WFS-T
   * @param {Object} properties - Hospital properties
   * @param {Array} coordinates - [lng, lat]
   * @returns {Promise<Object>} Response with success status
   */
  async insertHospital(properties, coordinates) {
    const xml = this.buildInsertXml(properties, coordinates);
    return await this.postWFST(xml);
  }

  /**
   * Update an existing hospital feature via WFS-T
   * @param {string} fid - Feature ID
   * @param {Object} properties - Updated properties
   * @param {Array} coordinates - [lng, lat]
   * @returns {Promise<Object>} Response with success status
   */
  async updateHospital(fid, properties, coordinates) {
    const xml = this.buildUpdateXml(fid, properties, coordinates);
    return await this.postWFST(xml);
  }

  /**
   * Delete a hospital feature via WFS-T
   * @param {string} fid - Feature ID
   * @returns {Promise<Object>} Response with success status
   */
  async deleteHospital(fid) {
    const xml = this.buildDeleteXml(fid);
    return await this.postWFST(xml);
  }

  /**
   * Post WFS-T request to GeoServer
   * @private
   */
  async postWFST(xml) {
    try {
      const response = await fetch(
        `${this.GEOSERVER_URL}/${this.HOSPITAL_WORKSPACE}/ows`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/xml",
          },
          body: xml,
        }
      );

      if (response.status === 401 || response.status === 404) {
        if (typeof authManager !== "undefined") {
          authManager.showLoginRequired();
        }
        throw new Error("Authentication required");
      }

      const text = await response.text();
      return { success: response.ok, responseText: text };
    } catch (error) {
      console.error("WFS-T error:", error);
      throw error;
    }
  }

  /**
   * Build GetFeature XML with filter
   * @private
   */
  buildGetFeatureXml(filter) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const escapeCQL = (s) => {
      if (!s) return "";
      return String(s).replace(/'/g, "''");
    };

    let filterXml = "";
    if (filter) {
      const conditions = [];
      if (filter.name) {
        conditions.push(
          `<ogc:PropertyIsLike wildCard="*" singleChar="." escape="!">
            <ogc:PropertyName>name_th</ogc:PropertyName>
            <ogc:Literal>*${escapeCQL(filter.name)}*</ogc:Literal>
          </ogc:PropertyIsLike>`
        );
      }
      if (filter.district) {
        conditions.push(
          `<ogc:PropertyIsEqualTo>
            <ogc:PropertyName>district</ogc:PropertyName>
            <ogc:Literal>${esc(filter.district)}</ogc:Literal>
          </ogc:PropertyIsEqualTo>`
        );
      }

      if (conditions.length === 1) {
        filterXml = `<ogc:Filter>${conditions[0]}</ogc:Filter>`;
      } else if (conditions.length > 1) {
        filterXml = `<ogc:Filter><ogc:And>${conditions.join(
          ""
        )}</ogc:And></ogc:Filter>`;
      }
    }

    return `<?xml version="1.0"?>
<wfs:GetFeature service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:hospital_ws="http://hospital_ws">
  <wfs:Query typeName="${this.HOSPITAL_LAYER}">
    ${filterXml}
  </wfs:Query>
</wfs:GetFeature>`;
  }

  /**
   * Build Insert XML for WFS-T
   * @private
   */
  buildInsertXml(properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:hospital_ws="http://hospital_ws">
  <wfs:Insert>
    <hospital_ws:hospitals>
      <hospital_ws:name_th>${esc(properties.name_th)}</hospital_ws:name_th>
      <hospital_ws:name_en>${esc(properties.name_en)}</hospital_ws:name_en>
      <hospital_ws:district>${esc(properties.district)}</hospital_ws:district>
      <hospital_ws:address>${esc(properties.address)}</hospital_ws:address>
      <hospital_ws:geom>
        <gml:Point srsName="EPSG:4326">
          <gml:coordinates>${lng},${lat}</gml:coordinates>
        </gml:Point>
      </hospital_ws:geom>
    </hospital_ws:hospitals>
  </wfs:Insert>
</wfs:Transaction>`;
  }

  /**
   * Build Update XML for WFS-T
   * @private
   */
  buildUpdateXml(fid, properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:hospital_ws="http://hospital_ws">
  <wfs:Update typeName="${this.HOSPITAL_LAYER}">
    <wfs:Property>
      <wfs:Name>name_th</wfs:Name>
      <wfs:Value>${esc(properties.name_th)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>name_en</wfs:Name>
      <wfs:Value>${esc(properties.name_en)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>district</wfs:Name>
      <wfs:Value>${esc(properties.district)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>address</wfs:Name>
      <wfs:Value>${esc(properties.address)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>geom</wfs:Name>
      <wfs:Value>
        <gml:Point srsName="EPSG:4326">
          <gml:coordinates>${lng},${lat}</gml:coordinates>
        </gml:Point>
      </wfs:Value>
    </wfs:Property>
    <ogc:Filter>
      <ogc:FeatureId fid="${esc(fid)}"/>
    </ogc:Filter>
  </wfs:Update>
</wfs:Transaction>`;
  }

  /**
   * Build Delete XML for WFS-T
   * @private
   */
  buildDeleteXml(fid) {
    const esc = (v) => this.escapeXml(String(v || ""));

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:hospital_ws="http://hospital_ws">
  <wfs:Delete typeName="${this.HOSPITAL_LAYER}">
    <ogc:Filter>
      <ogc:FeatureId fid="${esc(fid)}"/>
    </ogc:Filter>
  </wfs:Delete>
</wfs:Transaction>`;
  }

  /**
   * Escape XML special characters
   * @private
   */
  escapeXml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

// Create global instance
const geoServerAPI = new GeoServerAPI();
