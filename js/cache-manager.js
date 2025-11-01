// Cache Manager - จัดการ cache ของ API
// ไฟล์นี้จัดการการเก็บและดึงข้อมูลจาก cache เพื่อลดการเรียก API ซ้ำ

class CacheManager {
  constructor(duration = CACHE_DURATION) {
    this.duration = duration;
    this.cache = {
      weather: {},
      flood: {},
      air: {},
      quakes: {},
    };
  }

  // สร้าง cache key ที่รวม region เข้าไป
  getCacheKey(cacheType, region) {
    return `${cacheType}_${region}`;
  }

  // ตรวจสอบว่า cache ยังใช้ได้หรือไม่
  isValid(cacheType, region) {
    const key = this.getCacheKey(cacheType, region);
    const cached = this.cache[cacheType][key];

    if (!cached || !cached.data || !cached.timestamp) return false;

    const now = Date.now();
    const isExpired = now - cached.timestamp >= this.duration;

    if (isExpired) {
      console.log(`Cache expired for ${cacheType} (${region})`);
      delete this.cache[cacheType][key];
      return false;
    }

    console.log(`Cache hit for ${cacheType} (${region})`);
    return true;
  }

  // ดึงข้อมูลจาก cache
  get(cacheType, region) {
    const key = this.getCacheKey(cacheType, region);
    return this.cache[cacheType][key]?.data || null;
  }

  // บันทึกข้อมูลลง cache
  set(cacheType, region, data) {
    const key = this.getCacheKey(cacheType, region);
    this.cache[cacheType][key] = {
      data: data,
      timestamp: Date.now(),
    };
    console.log(
      `Cached ${cacheType} for ${region} (${
        Array.isArray(data) ? data.length : "N/A"
      } items)`
    );
  }

  // ล้าง cache ทั้งหมดหรือเฉพาะ type
  clear(cacheType = null) {
    if (cacheType) {
      this.cache[cacheType] = {};
      console.log(`Cleared cache for ${cacheType}`);
    } else {
      this.cache = {
        weather: {},
        flood: {},
        air: {},
        quakes: {},
      };
      console.log(`Cleared all cache`);
    }
  }

  // แสดงสถานะ cache
  getStatus() {
    const status = {};
    for (const [type, regionCache] of Object.entries(this.cache)) {
      status[type] = Object.keys(regionCache).length;
    }
    return status;
  }
}

// สร้าง instance ของ CacheManager
const cacheManager = new CacheManager();
