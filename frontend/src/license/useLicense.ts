import { useState, useEffect } from "preact/hooks";
import { getLicense, type LicenseInfo } from "./license";

/**
 * Reactive hook that re-renders when the license changes.
 */
export function useLicense(): LicenseInfo {
  const [license, setLicense] = useState<LicenseInfo>(getLicense());

  useEffect(() => {
    const handler = () => setLicense(getLicense());
    window.addEventListener("licensechange", handler);
    return () => window.removeEventListener("licensechange", handler);
  }, []);

  return license;
}
