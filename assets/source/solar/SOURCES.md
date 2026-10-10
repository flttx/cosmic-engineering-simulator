# Solar observation sources

Provider: NASA / Solar Dynamics Observatory (SDO), HMI and AIA instrument browse imagery.

- HMI continuum intensity: `nasa_hmi_visible.jpg`, 4096px, original URL https://sdo.gsfc.nasa.gov/assets/img/latest/latest_4096_HMII.jpg. Caption in the source image: `2026.09.21_15:11:15_TAI`. HTTP Last-Modified: 2026-09-21 15:40:07 GMT.
- AIA 171 Å: `nasa_aia_171.jpg`, 2048px, original URL https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0171.jpg. Caption in the source image: `2026-09-21 15:26:46 UT`. HTTP Last-Modified: 2026-09-21 15:42:27 GMT.

Downloaded on 2026-10-09 and preserved unchanged. The AIA runtime file is a byte-identical copy in `public/assets/solar/`. The HMI image is retained only in this source archive; the user requested removal of the grayscale mode on 2026-10-09, so it is no longer shipped or loaded by the app. These are frozen snapshots, not a live feed. NASA/SDO credit and the AIA channel remain visible in the UI.

The photospheric channel is an instrument grayscale image; the EUV channel uses false color and is explicitly labeled. A single visible solar disk is mapped as visual reference onto a 3D demonstration sphere and stays facing the observer to avoid inventing a measured back side or stretching a flat image through a rotating sphere. Back-side coverage, whole-surface geometry, image exposure and rendered scale are not measurements from these images. The browser does not claim a 360-degree solar observation.

Data overview: https://sdo.gsfc.nasa.gov/data/
Official file naming / downloads: https://sdo.gsfc.nasa.gov/data/bestpractice.php
