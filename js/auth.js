// Authentication Manager
// Handles GeoServer Spring Security login and session management

class AuthManager {
  constructor() {
    this.GEOSERVER_URL = "http://localhost:8080/geoserver";
    this.LOGIN_ENDPOINT = `${this.GEOSERVER_URL}/j_spring_security_check`;
  }

  /**
   * Login to GeoServer using Spring Security
   * @param {string} username - GeoServer username
   * @param {string} password - GeoServer password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async login(username, password) {
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(this.LOGIN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include",
        body: formData.toString(),
      });

      // Spring Security redirects on success, returns error page on failure
      // Check if we got redirected or got error page
      if (response.ok || response.redirected) {
        // Store username for display
        sessionStorage.setItem("geoserver_user", username);
        return { success: true };
      } else {
        return {
          success: false,
          error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message,
      };
    }
  }

  /**
   * Logout from GeoServer
   */
  async logout() {
    try {
      await fetch(`${this.GEOSERVER_URL}/j_spring_security_logout`, {
        method: "POST",
        credentials: "include",
      });
      sessionStorage.removeItem("geoserver_user");
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "login.html";
    }
  }

  /**
   * Check if user is authenticated by testing a GeoServer API call
   * @returns {Promise<boolean>}
   */
  async checkAuth() {
    try {
      const response = await fetch(
        `${this.GEOSERVER_URL}/rest/about/version.json`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current logged in username
   * @returns {string|null}
   */
  getUsername() {
    return sessionStorage.getItem("geoserver_user");
  }

  /**
   * Show login required alert
   */
  showLoginRequired() {
    alert("กรุณาเข้าสู่ระบบก่อนใช้งานฟีเจอร์นี้");
    window.location.href = "login.html";
  }
}

// Create global instance
const authManager = new AuthManager();
