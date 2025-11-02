/*
  GeoServer API Manager (บทสรุปภาษาไทย)
  - ทำหน้าที่เป็นตัวกลางในการติดต่อกับ GeoServer (WFS / WFS-T)
  - ใช้สำหรับดึงข้อมูล (GetFeature), เพิ่ม (Insert), แก้ไข (Update), ลบ (Delete)
  - รับผิดชอบการสร้าง XML สำหรับ WFS-T และจัดการการยืนยันตัวตน
  - เหมาะสำหรับผู้ที่ต้องการให้เว็บคุยกับ GeoServer โดยไม่ต้องรู้รายละเอียด XML
*/
// GeoServer API Manager
// Handles all WFS/WMS requests to GeoServer with authentication

class GeoServerAPI {
  constructor() {
    this.GEOSERVER_URL = "http://localhost:8080/geoserver";
    this.HOSPITAL_WORKSPACE = "db_gis";
    this.HOSPITAL_LAYER = "db_gis:hospitals";
    this.STUDENT_WORKSPACE = "db_gis";
    this.STUDENT_LAYER = "db_gis:students";
  }

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
      if (String(error).includes("SyntaxError: Unexpected token")) {
        if (typeof authManager !== "undefined") {
          authManager.showLoginRequired();
        }
      }
      console.error("Error fetching hospitals:", error);
      throw error;
    }
  }

  async insertHospital(properties, coordinates) {
    const xml = this.buildInsertXml(properties, coordinates);
    return await this.postWFST(xml, this.HOSPITAL_WORKSPACE);
  }

  async updateHospital(fid, properties, coordinates) {
    const xml = this.buildUpdateXml(fid, properties, coordinates);
    return await this.postWFST(xml, this.HOSPITAL_WORKSPACE);
  }

  async deleteHospital(fid) {
    const xml = this.buildDeleteXml(fid, this.HOSPITAL_LAYER);
    return await this.postWFST(xml, this.HOSPITAL_WORKSPACE);
  }

  // ==================== STUDENTS ====================

  async fetchStudents(filter = null) {
    try {
      let url;
      let options = {
        method: "GET",
        credentials: "include",
      };

      if (filter && (filter.s_name || filter.district || filter.province)) {
        url = `${this.GEOSERVER_URL}/${this.STUDENT_WORKSPACE}/ows`;
        const xml = this.buildGetFeatureXmlStudents(filter);
        options = {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/xml",
          },
          body: xml,
        };
      } else {
        url = `${this.GEOSERVER_URL}/${this.STUDENT_WORKSPACE}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${this.STUDENT_LAYER}&outputFormat=application/json`;
      }

      const response = await fetch(url, options);

      if (response.status === 401 || response.status === 404) {
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
      console.error("Error fetching students:", error);
      throw error;
    }
  }

  async insertStudent(properties, coordinates) {
    const xml = this.buildInsertXmlStudent(properties, coordinates);
    return await this.postWFST(xml, this.STUDENT_WORKSPACE);
  }

  async updateStudent(fid, properties, coordinates) {
    const xml = this.buildUpdateXmlStudent(fid, properties, coordinates);
    return await this.postWFST(xml, this.STUDENT_WORKSPACE);
  }

  async deleteStudent(fid) {
    const xml = this.buildDeleteXml(fid, this.STUDENT_LAYER);
    return await this.postWFST(xml, this.STUDENT_WORKSPACE);
  }

  async postWFST(xml, workspace) {
    try {
      const response = await fetch(`${this.GEOSERVER_URL}/${workspace}/ows`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xml,
      });

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
  xmlns:db_gis="http://db_gis">
  <wfs:Query typeName="${this.HOSPITAL_LAYER}">
    ${filterXml}
  </wfs:Query>
</wfs:GetFeature>`;
  }

  buildInsertXml(properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:db_gis="http://db_gis">
  <wfs:Insert>
    <db_gis:hospitals>
      <db_gis:name_th>${esc(properties.name_th)}</db_gis:name_th>
      <db_gis:name_en>${esc(properties.name_en)}</db_gis:name_en>
      <db_gis:district>${esc(properties.district)}</db_gis:district>
      <db_gis:address>${esc(properties.address)}</db_gis:address>
      <db_gis:source>${esc(properties.source)}</db_gis:source>
      <db_gis:geom>
        <gml:Point srsName="EPSG:4326">
          <gml:coordinates>${lng},${lat}</gml:coordinates>
        </gml:Point>
      </db_gis:geom>
    </db_gis:hospitals>
  </wfs:Insert>
</wfs:Transaction>`;
  }

  buildUpdateXml(fid, properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:db_gis="http://db_gis">
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
      <wfs:Name>source</wfs:Name>
      <wfs:Value>${esc(properties.source)}</wfs:Value>
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

  buildDeleteXml(fid, layerName) {
    const esc = (v) => this.escapeXml(String(v || ""));

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:db_gis="http://db_gis">
  <wfs:Delete typeName="${layerName}">
    <ogc:Filter>
      <ogc:FeatureId fid="${esc(fid)}"/>
    </ogc:Filter>
  </wfs:Delete>
</wfs:Transaction>`;
  }

  // ==================== STUDENTS BUILD XML METHODS ====================

  buildGetFeatureXmlStudents(filter) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const escapeCQL = (s) => {
      if (!s) return "";
      return String(s).replace(/'/g, "''");
    };

    let filterXml = "";
    if (filter) {
      const conditions = [];
      if (filter.s_name) {
        conditions.push(
          `<ogc:PropertyIsLike wildCard="*" singleChar="." escape="!">
            <ogc:PropertyName>s_name</ogc:PropertyName>
            <ogc:Literal>*${escapeCQL(filter.s_name)}*</ogc:Literal>
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
      if (filter.province) {
        conditions.push(
          `<ogc:PropertyIsEqualTo>
            <ogc:PropertyName>province</ogc:PropertyName>
            <ogc:Literal>${esc(filter.province)}</ogc:Literal>
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
  xmlns:db_gis="http://db_gis">
  <wfs:Query typeName="${this.STUDENT_LAYER}">
    ${filterXml}
  </wfs:Query>
</wfs:GetFeature>`;
  }

  buildInsertXmlStudent(properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:db_gis="http://db_gis">
  <wfs:Insert>
    <db_gis:students>
      <db_gis:s_id>${esc(properties.s_id)}</db_gis:s_id>
      <db_gis:s_name>${esc(properties.s_name)}</db_gis:s_name>
      <db_gis:curriculum>${esc(properties.curriculum)}</db_gis:curriculum>
      <db_gis:department>${esc(properties.department)}</db_gis:department>
      <db_gis:faculty>${esc(properties.faculty)}</db_gis:faculty>
      <db_gis:graduated_from>${esc(
        properties.graduated_from
      )}</db_gis:graduated_from>
      <db_gis:subdistrict>${esc(properties.subdistrict)}</db_gis:subdistrict>
      <db_gis:district>${esc(properties.district)}</db_gis:district>
      <db_gis:province>${esc(properties.province)}</db_gis:province>
      <db_gis:geom>
        <gml:Point srsName="EPSG:4326">
          <gml:coordinates>${lng},${lat}</gml:coordinates>
        </gml:Point>
      </db_gis:geom>
    </db_gis:students>
  </wfs:Insert>
</wfs:Transaction>`;
  }

  buildUpdateXmlStudent(fid, properties, coordinates) {
    const esc = (v) => this.escapeXml(String(v || ""));
    const [lng, lat] = coordinates;

    return `<?xml version="1.0"?>
<wfs:Transaction service="WFS" version="1.0.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:db_gis="http://db_gis">
  <wfs:Update typeName="${this.STUDENT_LAYER}">
    <wfs:Property>
      <wfs:Name>s_id</wfs:Name>
      <wfs:Value>${esc(properties.s_id)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>s_name</wfs:Name>
      <wfs:Value>${esc(properties.s_name)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>curriculum</wfs:Name>
      <wfs:Value>${esc(properties.curriculum)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>department</wfs:Name>
      <wfs:Value>${esc(properties.department)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>faculty</wfs:Name>
      <wfs:Value>${esc(properties.faculty)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>graduated_from</wfs:Name>
      <wfs:Value>${esc(properties.graduated_from)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>subdistrict</wfs:Name>
      <wfs:Value>${esc(properties.subdistrict)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>district</wfs:Name>
      <wfs:Value>${esc(properties.district)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>province</wfs:Name>
      <wfs:Value>${esc(properties.province)}</wfs:Value>
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
