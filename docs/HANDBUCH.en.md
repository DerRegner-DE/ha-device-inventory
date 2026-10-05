# Device Management — User Manual

Version: v3.1.0 · 2026-10-05

This manual describes how to set up and use Device Management and answers the most common questions from the forum. New to the app? Start with the first chapter and the quick start. If you know an older version, go straight to the chapter that raises questions.

---

## Contents

1. [What Device Management is for](#what-device-management-is-for)
2. [Installation, update, uninstallation](#installation-update-uninstallation)
3. [Free and Pro](#free-and-pro)
4. [Quick start in 5 steps](#quick-start-in-5-steps)
5. [Recording devices](#recording-devices)
6. [Home Assistant integration (MQTT Discovery)](#home-assistant-integration-mqtt-discovery)
7. [Multi-channel devices (parent-child)](#multi-channel-devices-parent-child)
8. [Merging duplicate devices](#merging-duplicate-devices)
9. [Insurance documentation & estate planning — the typical workflows](#insurance-documentation--estate-planning--the-typical-workflows)
10. [Import Excel](#import-excel)
11. [Filters, search and sorting](#filters-search-and-sorting)
12. [Trash & database snapshots](#trash--database-snapshots)
13. [Frequently asked questions (FAQ)](#frequently-asked-questions-faq)
14. [Troubleshooting](#troubleshooting)
15. [Privacy and legal](#privacy-and-legal)
16. [Support and contact](#support-and-contact)

---

## What Device Management is for

A smart home grows: routers, sensors, plugs, cameras, thermostats, gateways. Where is the repeater's serial number, when was the thermostat bought, is the warranty still valid, which light switch is bridged? Device Management is a searchable inventory of every device in the house — directly in Home Assistant.

Typical uses:

- **Insurance** — inventory with serial numbers, purchase dates, photos and receipts; everything at hand when damage occurs.
- **Warranty** — purchase date and warranty end for each device.
- **Maintenance** — firmware, IP and MAC address, network and integration at a glance.
- **Handover, removal, estate** — the list for relatives, electricians or buyers: what works without Home Assistant, which switches are bridged, where the documents are.
- **Rental and tax** — document the equipment of rental flats or devices used for business.

The app runs as a Home Assistant add-on with its own database. It works on phone, tablet and PC, and also without a connection; changes are synchronized as soon as the connection is back.

---

## Installation, update, uninstallation

**Requirements:** Home Assistant OS or Supervised (the *Apps* menu item, formerly *Add-ons*, must be present), architecture amd64, aarch64 (e.g. Raspberry Pi 4/5) or armv7, a current browser. Camera and barcode scanner need an encrypted connection (HTTPS), see [Camera and scanner](#camera-and-scanner).

**Install:**

1. In Home Assistant, open **Settings → Apps** (in older versions **Add-ons**) → bottom right, **Install app**. The **App store** opens.
2. Top right, open the three-dot menu → **Repositories**.
3. Paste `https://github.com/DerRegner-DE/ha-device-inventory`, click **Add**, close the dialog.
4. Search the store for **Geraeteverwaltung** (reload the page if needed) → **Install**.
5. Click **Start**, turn on **Show in sidebar**, click **Open Web UI**.

**Update:** Home Assistant shows an available update under *Settings → Apps → Geräteverwaltung* (and in the notifications). Click **Update**. Leaving *Create backup before updating* turned on is recommended, because updates can extend the database. Alternatively, turn on *Auto update*. The add-on's changelog lists what is new. After an update, see the section "After updating" in the quick start.

**Uninstall:** *Settings → Apps → Geräteverwaltung → Uninstall*. Home Assistant then deletes the add-on's data directory, including database, photos and license. Back up first: *Settings → Export Data* (JSON; Excel and PDF with Pro) or a Home Assistant backup that includes the add-on.

---

## Free and Pro

The basic functions are free; a one-time license key unlocks the extended functions (**€9.99**, no subscription).

| | Free | Pro |
|---|:---:|:---:|
| Record devices by hand, all basic sections of the form | up to 50 | unlimited |
| Languages | English | German, English, Spanish, French, Russian |
| Dashboard, search, filters, sorting, "Parents only", offline mode, sidebar, dark mode | ✓ | ✓ |
| Your own categories, JSON export | ✓ | ✓ |
| Merge duplicate devices, clean up self-imports | ✓ | ✓ |
| Trash, database snapshots, change history | ✓ | ✓ |
| Turn off MQTT, "Clean up orphans", "Remove all MQTT entries" | ✓ | ✓ |
| View existing photos, installation photos, documents and handover details | ✓ | ✓ |
| HA import, recategorize devices | — | ✓ |
| PDF and Excel export with presets, order and images in the PDF; import Excel | — | ✓ |
| Camera, QR/barcode scanner, device photo | — | ✓ |
| Upload, link and delete documents | — | ✓ |
| Add and delete installation photos | — | ✓ |
| Edit handover fields ("Works without Home Assistant?", "Wall switch bridged?", "External link") | — | ✓ |
| Bulk editing (*Select*) | — | ✓ |
| Turn on MQTT, "Test MQTT connection", "Sync all devices now" (and with it the sensors in HA and the *Visit* link) | — | ✓ |

Everything you have already recorded stays visible without a license, and you can turn MQTT off and clean it up at any time. So nothing is left behind if Pro is no longer active.

**Buy:** via the link in the README of the GitHub repository; the key arrives by e-mail with the purchase confirmation. One key is valid for up to three installations and does not expire.

**Activate:** *Settings → License*, enter the key in the *License Key* field, click **Activate**. The Pro functions are unlocked immediately. On activation and occasionally afterwards, the add-on verifies the key with the payment provider Lemon Squeezy; without internet, the last successful check remains valid.

If no e-mail arrives after the purchase: check the spam folder, otherwise write to support@derregner.info.

---

## Quick start in 5 steps

1. **Install the add-on** as described under [Installation, update, uninstallation](#installation-update-uninstallation). After installation, Device Management appears as an entry in the HA sidebar.
2. **Activate the Pro license** under *Settings → License*. Without a license you can manage up to 50 devices by hand, and the interface is in English. Pro includes, among other things, HA import, more languages, PDF/Excel export, MQTT, camera, scanner, documents, installation photos, handover fields and bulk editing — the full list is under [Free and Pro](#free-and-pro).
3. **Import HA devices** (Pro) under *Settings → Home Assistant Import → Import HA Devices*. With large setups (300+), the import can take a minute; it runs in the background with a progress indicator. It imports name, manufacturer, model, firmware, room and floor, integration, network and — since 3.1.0 — serial number, MAC address and power supply (Battery/Rechargeable), as far as Home Assistant knows them. A repeated import does not create duplicate devices; for existing devices it fills in serial number and MAC only where the fields are empty.
4. **Optional: enable MQTT Discovery** (Pro) under *Settings → Home Assistant Integration → Publish devices to HA* — whether this makes sense is explained in the chapter [Home Assistant integration](#home-assistant-integration-mqtt-discovery).
5. **Complete your first devices**: tap a device in the list, then *Edit*, and enter at least *Purchase Date* and *Warranty Until*, and the purchase price under *Notes*. With Pro, add a photo and installation photos and upload receipts as documents — ready for insurance documentation.

### After updating to 3.1.0

Once, in this order:

1. *Settings → Home Assistant Import → Import HA Devices* (Pro) — fills in serial number and MAC for existing devices and removes wrong router assignments (see [Multi-channel devices](#multi-channel-devices-parent-child)).
2. *Settings → Possible duplicates* — check duplicate devices and merge them (see [Duplicate devices](#merging-duplicate-devices)).
3. *Settings → Recategorize devices → Preview & cherry-pick* (Pro) — after 3.1.0 the preview shows considerably more suggestions than before, because detection sees the device classes from Home Assistant for the first time. The power supply is also filled in. Review the preview first, deselect individual rows, then apply. Everything can be undone via snapshot and device history.

---

## Recording devices

Add new devices via **Add** in the bottom bar; edit existing ones via the detail page → **Edit**. Only *Device Type* and *Name* are required. The form is divided into sections that can be expanded and collapsed:

| Section | Fields |
|---|---|
| Basic Data | Device Type, Name, Model, Manufacturer, Firmware |
| Location | Area from Home Assistant (the floor follows from it) |
| Network & Power | Network, Power Supply, IP Address, MAC Address |
| Details | Serial Number, AIN / Article No., Purchase Date, Warranty Until |
| Home Assistant | Integration, Entity ID, Device ID |
| Notes | Function, Notes, "Works without Home Assistant?", "Wall switch bridged?", External link (editing the last three: Pro) |

When editing, **Installation photos** (Pro; with a caption, e.g. "behind the cover, top left") and **Documents** (Pro; invoice, manual — as a file or link) appear below. You can take a device photo (Pro) at the top of the form with the camera icon or select it as a file. Without Pro, existing photos, documents and handover details stay visible; the form then shows the note "Editing the handover fields is a Pro feature. Existing entries stay visible." or "Adding or deleting installation photos is a Pro feature." Every change is recorded in the *Change history* on the detail page and can be reverted there individually.

**Integration** is a free-text field: the suggestion list contains the common integrations and all integrations in your own inventory; you can type any other value.

**Selection values:**

- *Network:* WiFi, LAN, Zigbee, Z-Wave, Bluetooth, Thread/Matter, DECT, Powerline, HomeMatic RF, KNX, Modbus, 1-Wire, RS-232, EnOcean, USB
- *Power Supply:* Power Adapter, 230V Mains, Battery, Rechargeable, USB, PoE, Solar, High Voltage
- *Device types (32):* Router, Repeater, Powerline, DECT Repeater, Outlet, Light Switch, Light Bulb, Actuator/Relay, Switch/Button, Shutter, Thermostat, Controller/Gateway, Camera, Doorbell, Chime, Lock, Alarm System, Voice Assistant, Smart TV, Streaming, Display/Dashboard, Tablet, Speaker, Appliance, Robot Mower, Irrigation, Fan, Remote Control, Printer, Sensor, Smartphone, Other

Create your own device types under *Settings → Manage categories*; they then appear in all selection lists, in bulk editing (Pro) and as filter tabs.

### Camera and scanner

With Pro, you can take photos directly and scan QR codes and barcodes. A MAC address in the code is detected and entered; otherwise the content goes into the form as the serial number. Structured codes (e.g. `SN:…|MAC:…|MODEL:…`) fill several fields at once. Browsers allow the camera only over an encrypted connection: via Home Assistant Cloud (Nabu Casa), your own certificate or a reverse proxy. With access via `http://<IP>:8123`, you can still select an existing image, but not use the camera.

---

## Home Assistant integration (MQTT Discovery)

By far the most common forum question. This section explains **what** the toggle does, **when** it makes sense and **how** to remove it cleanly again.

Turning it on, *Test MQTT connection* and *Sync all devices now* are Pro. Turning it off and the two clean-up buttons always work, even without a license.

### What happens when you enable it?

When you turn on *Publish devices to HA*, the add-on publishes **up to 6 MQTT Discovery entries per inventory device** to the broker configured in the add-on options (default: `core-mosquitto`):

| Entity type | Content | Example |
|------------|--------|----------|
| Sensor `*_warranty` | ISO date until which the warranty runs | `2027-03-15` |
| Sensor `*_warranty_days` | remaining days as a number | `123` |
| Sensor `*_purchase` | purchase date | `2024-09-12` |
| Sensor `*_type` | device type | `Router` |
| Sensor `*_location` | location | `Office 1st floor` |
| Binary sensor `*_warranty_active` | `on` while the warranty runs | `on` / `off` |

These entities appear in HA under *Settings → Devices & services → MQTT*, with a separate device card for each inventory entry.

**Since 3.1.0**, the sensor `*_type` also carries the maintained details as attributes: location, serial number, power supply, function, notes, "works without HA" and "wall switch bridged" with their notes, external link, and the number of photos and installation photos (attributes `fotos` and `einbauort_bilder`). Empty values are omitted. Both counters are also correct after *Sync all devices now*; if you add or delete a photo or installation photo, HA shows the new number right away. In automations, access them e.g. via `state_attr('sensor.landroid_s300_device_type', 'seriennummer')`.

**Back to the app:** On the HA device page of each device published this way, there is a **Visit** link. It opens this device directly in Device Management. For devices of other integrations (e.g. the original device page of a Shelly), an add-on cannot set a link — there, the only way is via the MQTT card of the inventory entry.

### Credentials for the MQTT broker

**Purpose:** To publish, Device Management must log in to the MQTT broker; the Mosquitto add-on only admits authenticated clients. Apart from that, the app works fully without MQTT — only the sensors in HA and the *Visit* link are affected.

The add-on first requests the credentials from the Supervisor. If the Mosquitto add-on provides them there, you do not need to enter anything. If the test under *Settings → Home Assistant Integration → Test MQTT connection* reports **"Not authorized"** (code 135), the add-on needs a user. The simplest option is a dedicated Home Assistant user — the Mosquitto add-on accepts every HA user:

1. In Home Assistant, bottom left, open **Settings** → **People** → the **Users** tab at the top (visible to administrators; in older HA versions only after turning on **Advanced mode** in your own profile).
2. Bottom right, click **Add user**. **Display name** and **Username** e.g. `geraeteverwaltung`; set a **Password**.
3. Turn on **Local only**, leave **Administrator** off. Click **Create**.
4. **Settings** → **Apps** (in older versions **Add-ons**) → **Geräteverwaltung** → **Configuration** tab.
5. Enter the username under **mqtt_user** and the password under **mqtt_password**. Click **Save**, then on the **Info** tab at the top click **Restart**.
6. In Device Management, click *Test MQTT connection* — it should now report "OK".

Why a dedicated user instead of your own account: it has no administrator rights, logs in only from the home network, and the add-on configuration contains its password instead of yours. When it is no longer needed, you can delete it without affecting anything else.

### When does this make sense?

- **Warranty reminders**: an HA automation on the sensor `*_warranty_days` that notifies you as soon as the value drops to 30 or below. The binary sensor `*_warranty_active` only switches to `off` on the expiry day, so it is not suitable for an early warning.
- **Dashboard cards**: "All devices under warranty", "Devices whose warranty expires soon", sorted by `*_warranty_days`.
- **Inventory statistics** in the HA dashboard, without opening Device Management itself.

It does **not** make sense if you use the add-on purely as a documentation tool — then it only creates HA cards that nobody looks at.

### Cleaning up when you no longer want it

A frequently asked question: *"How do I delete all the MQTT topics again when I switch the add-on off?"*

By default, the retained MQTT topics **remain** on the broker, even if you turn the toggle off. This is an MQTT Discovery peculiarity (HA does not delete retained messages written by another producer). Three ways to clean up properly:

1. **(Recommended) Clean up orphans**: Since v2.6.0, the *Home Assistant Integration* section of the settings has the button **"Clean up orphans"**. The button removes all retained topics for inventory devices that you have already deleted in Device Management. Active devices remain untouched. Safe as a routine action.

2. **Remove all MQTT entries**: Next to it is the button **"Remove all MQTT entries"** (red). With confirmation. Removes **every** Discovery message published by the add-on, including those for devices still in the inventory. A sensible last step before permanently disabling MQTT Discovery.

3. **Manually with MQTT Explorer**: topic `geraeteverwaltung/#` and `homeassistant/+/geraeteverwaltung/+/config` — for each topic, right-click → "Delete topic". The only method for existing installations without v2.6.0.

### Devices remain in HA after I deleted them in the add-on

Up to v2.5.2, a bug skipped the MQTT cleanup when deleting individual devices — the Discovery topics then remained, even though the add-on itself should have sent a "delete this device" signal. From v2.5.3, single-device cleanup works reliably again. For existing leftovers: one click on *Clean up orphans* removes them.

---

## Multi-channel devices (parent-child)

Examples: Shelly 2PM (two outlet channels in one housing), Tuya hubs, USB hubs, Bosch SHC with connected thermostats. For such setups, HA often creates several devices (main device + one sub-device per channel/sensor) and links them via `via_device_id`.

### What Device Management does with them

- During the HA import, `via_device_id` is evaluated and stored as `parent_uuid` in the inventory.
- In the detail view of a sub-device, the box **"Part of: …"** at the top links directly to the main device.
- In the detail view of a main device, the box **"Sub-devices (N)"** lists all children.
- If you press **Back** in a sub-device, you return to the main device — not to the global list.

### Hiding sub-devices

With multi-channel setups the list grows quickly — three rows for one physical device. In the list, to the left of the sorting, there is the button **"Parents only"**; it only appears if at least one device is assigned to a main device as a sub-device. When active, sub-devices are hidden and the button label shows the number of hidden children. The filter persists for the session.

**Routers are not main devices (since 3.1.0):** FRITZ!Box and UPnP report *every* device on the network to Home Assistant as attached to them. The import used to turn this into "Part of FRITZ!Box" — doorbell, robot mower and phones then disappeared in the *Parents only* filter. The import no longer takes over such router assignments and removes existing ones on the next run. Real hubs such as the Zigbee coordinator, Bosch Smart Home Controller or HomematicIP Access Point remain main devices of their devices. If a browser that is already open still shows the old assignment: *Settings → Clear Local Cache → Clear cache*.

**Routing hubs are not hidden:** HA also sets `via_device_id` for devices connected via a bridge (Zigbee2MQTT bridge → Hue/IKEA/Aqara, ZHA coordinator → end devices, Z-Wave JS stick → end devices, Matter server → end devices). These "children" are separate hardware; only the bridge is software. The filter therefore treats devices with integration `mqtt`, `zha`, `zwave_js` or `matter` like main devices — otherwise the main-device filter would hide the real lamps and leave only the bridge.

### Applying edits to all children

When you edit a main device with sub-devices, a checkbox **"Also apply to N sub-devices"** appears at the end of the form. If it is checked, saving mirrors a bulk update of the following fields to all children *in addition* to the main device:

- Manufacturer
- Purchase Date
- Warranty Until
- Power Supply
- AIN article number

Channel-specific fields are **not** inherited: name, serial number, MAC, IP, location, Home Assistant IDs.

---

## Merging duplicate devices

*New in 3.1.0.* Since HA 2026.8, Home Assistant often creates several entries for one physical device: the Shelly via its own integration and again via the FRITZ!Box; with several FRITZ!Boxes in a mesh, even once per box. The device then appeared several times in the inventory.

**During the import**, the app automatically merges entries with the same MAC or Zigbee address from different integrations or configurations into one device. The entry of the integration that controls the device (Shelly, Ring, Bosch …) is kept, not that of the router. The twin is remembered and not created again on the next import.

**Devices already imported twice** (from versions before 3.1.0):

1. Expand *Settings → Possible duplicates*, click **Find duplicates**.
2. The list shows groups with the same MAC address. The top device of each group is the suggestion that is kept.
3. The button **→ into "name of the target device"** in a row merges that one device — or **Apply all suggestions** (click twice to confirm) for all groups at once.

**Manually**, for devices without a shared identifier: on the detail page, click **Merge with another device …**, search for and select the target device, click **Merge**.

What happens when merging:

- The target device keeps all its details. The app fills empty fields from the other device and appends notes.
- Photos, installation photos, documents, change history and sub-devices move to the target device.
- The other device goes to the trash. Beforehand, the app creates a database snapshot — everything can be restored via *Settings → Database snapshots*.

---

## Insurance documentation & estate planning — the typical workflows

### Insurance

The preset *Insurance* in the PDF / Excel export automatically selects the fields an insurer typically wants:

- #, Type, Name, Model, Manufacturer
- Serial No., AIN / Article No.
- Purchase Date, Warranty Until, Location, Notes
- External link

The PDF and Excel export, including presets, is Pro.

Workflow:

1. For every valuable device: take a photo, upload the purchase receipt as a document (both Pro), maintain notes with the purchase price and any insurance note.
2. Once a year: *Settings → Export Data → Export PDF / Excel... → Presets → Insurance*, then **PDF**. The PDF contains the devices as a compact table. If you also want a detail page per device, choose **All fields** under *Presets* or select the fields manually (very long notes are cut there at 1000 characters, with a reference to the Excel export).
3. Add Excel if the insurer processes the data further — Excel keeps the full length of the notes in one cell.

### Estate planning

The preset *Estate planning* is aimed at relatives — what is it, where is it, is there still a warranty, where are the documents, does it keep working without HA:

- #, Type, Name, Manufacturer, Model, Serial No., AIN / Article No.
- Purchase Date, Warranty Until
- Location, Floor
- Works without HA + note
- External link
- Function, Notes

Network details (MAC, IP, firmware, integration) have been deliberately excluded since 3.0.0 — heirs are not interested in them, and they only take up column width.

---

### Handover to someone else (removal/electrician)

*New in 3.0.0.* The background: at some point someone else stands in front of the installation — relatives, an electrician, a buyer. This person knows neither Home Assistant nor the history of the house.

For this, each device has three fields, at the very bottom of the edit form under *Notes*. You can edit them with Pro; existing entries stay visible without a license.

**"Works without Home Assistant?"** — three options: *Unknown* (default, nothing is output), *Yes, works without HA*, *No, needs HA*. With *Yes* or *No*, a note field for plain text appears below: "switch directly on the wall", "thermostat can be set on the device", "cannot be operated at all without HA".

**"Wall switch bridged?"** (*new in 3.1.0*) — the most important point for removal: if a light switch was bridged for this device, the lamp will no longer work after the device is removed. Three options (*Unknown*, *Yes, switch bridged or decoupled*, *No*) and a note field: which switch, which box — or which setting, because often nothing is wired at all, but the actuator is reconfigured (e.g. Shelly in "detached" mode). Appears on the detail page under the heading "Wall switch". The same box shows "Home Assistant dependency" (the answer from "Works without Home Assistant?") and "External link".

**"External link"** — a pointer to another system: the document in Paperless-ngx, the manufacturer's manual page, an entry in your own wiki. The link is shown on the detail page and opens in a new window. A plain name such as `paperless.local/x` is enough; `https://` is added automatically.

The export preset **"Removal/electrician"** (*Export PDF / Excel... → Presets*, Pro) turns this into the sheet you put in the utility room:

- #, Type, Name, Manufacturer, Model
- Location, Floor
- Network, Power
- Works without HA + note
- Switch bridged + note
- External link
- Function, Notes

Deliberately **without** serial numbers, purchase data and warranty: this is the list that can lie openly in the hallway, while the insurance and estate presets contain the complete data.

The *Integration* column has been excluded since 3.0.0 — `fritz` or `bosch_shc` are Home Assistant internals and mean nothing to a tradesperson.

The preset **"Emergency folder"** (*new in 3.1.0*) is the folder for the meter cabinet — for the electrician, neighbour or estate agent that relatives call in an emergency: device, floor and location, manufacturer, model, serial number, power supply, works-without-HA, bridged switches, purchase date, warranty, link to the manual, function and notes. Without network details. Passwords do not belong in it — the app never stores any; a note in the notes field saying where the credentials are kept (password manager, folder) is enough.

**All presets compared:**

| Preset | For whom | Contains |
|---|---|---|
| Insurance | Claims handler in case of damage | Device, serial number, purchase date, warranty, location, link to the invoice |
| Removal/electrician | Tradesperson on site | Device, location, network, power, works-without-HA, bridged switches, link — no purchase data |
| Estate planning | Relatives | Device, serial number, purchase date, warranty, location, works-without-HA, link |
| Emergency folder | Helper called in by relatives | Device, location, serial number, power, works-without-HA, bridged switches, purchase date, warranty, link |

As a PDF, these four presets produce a compact table in landscape format, about ten pages for 300 devices. You get detail pages per device with **All fields** (also under *Presets*) or if you select the fields manually. Since 3.1.0, the app stores your own field selection on the server — so it also applies on your phone or after clearing the browser data.

**Order** (*new in 3.1.0*): In the export dialog, you can choose between *Grouped by category* (previous behaviour) and **Floor › Location › Name**. For the sheet in the fuse box, the second option is the right one: whoever stands in front of it searches by room, not by device name. In Excel it comes as a continuous table without category subheadings, which can be sorted and filtered freely.

**Images in PDF** (*new in 3.1.0*): Under *Images in PDF* you can add **Installation photos** and **Device photos and image documents**. The images appear as an image appendix at the end of the PDF; in the list, the *Images* column shows the reference for each device (B1, B2 …). An image attached to several devices appears only once, with all associated devices. Excel contains no images.

## Import Excel

*New in 3.1.0, Pro.* Under *Settings → Export Data*, below the export buttons, **Import Excel** reads an Excel file from *Export PDF / Excel...* back in.

- The app detects the columns by their heading, not by their position. Every field selection works, grouped by category as well as a continuous table. The *Floor* column is not imported.
- Photos, installation photos and documents are not part of the file.
- Without any further option, the devices are added **in addition** to your inventory. If you read your own export back in this way, every device exists twice afterwards.
- With the checkbox **"Replace existing devices (all to the trash, snapshot first)"**, all existing devices move to the trash before the file is read. After you select the file, you must confirm this with **"Really replace all devices?"**.

---

## Filters, search and sorting

- **Search** at the top searches name, model, manufacturer, location, MAC, IP, serial number, integration, function and type.
- **Category chips** below the search: built-in categories only if at least 1 device is in them; your own categories (from *Manage categories*) always since 3.1.0, as well as freely typed types. A click toggles between *active* and *off*. An active filter stays visible even if the last device of that category disappears — so that you can remove it again.
- **Photo preview**: if a device has a photo, the list shows it as a small preview (since 3.1.0).
- **Donut charts** and **top 10 lists** in the dashboard are clickable — clicking a manufacturer bar sets a manufacturer filter and jumps to the device list.
- **Filter chips** above the list (e.g. "By Manufacturer (Top 10): BOSCH ×") show the active filter; the X removes it.
- **Sorting**: dropdown on the right. Options: Recently edited (default), Name A→Z/Z→A, Type, Manufacturer, Location, Warranty expiring soon (nearest expiry first). The selection persists for the session.
- **"Parents only" toggle**: hides children (see chapter Multi-channel).
- **Bulk editing** (Pro): with **Select** above the list, mark several devices and change their type or integration together, or delete them. Without Pro, the button is greyed out and has the suffix "(Pro)".

---

## Trash & database snapshots

### Trash

- Deleted devices go to the trash first and can be restored for 30 days under *Settings → Trash*.
- After 30 days, the app deletes them permanently and automatically. It checks this when the add-on starts and then once a day. Before that, it creates a snapshot ("Before automatic trash cleanup (30 days)"); you can use it to get these devices back as well.
- Two restore modes: per entry (button in each row) or in bulk ("Restore N" at the top right after selection).
- *Delete permanently* removes the device with its photos, installation photos and documents, including the associated files.
- **Empty trash** (at the top of the trash) permanently deletes all entries at once. The first click asks "Really delete all {N} permanently?"; only the second click deletes. Before that, the app creates a snapshot ("Before emptying the trash"); the same applies when you permanently delete several selected entries.
- The button *Move all devices to trash* (Settings, at the very bottom) is meant as a last-resort reset button — it moves the entire inventory to the trash, with a snapshot.

### Database snapshots

- Before every bulk action, the app automatically creates a snapshot of the database: deleting several or all devices, recategorizing, bulk editing, merging, "Apply all suggestions", deleting a category, Excel import with replace, cleaning up self-imports, emptying the trash or permanently deleting several entries, automatic trash cleanup, and before every restore.
- By hand: *Settings → Database snapshots* → **Create snapshot now**, e.g. before your own clean-up work. It appears in the list as "Created manually".
- List under *Settings → Database snapshots*. Per entry: the reason in plain text (e.g. "Before merge", "Before deleting category “…”"), age and size.
- *Restore* overwrites the current DB with the snapshot — an "undo for the last action".

---

## Frequently asked questions (FAQ)

### "My add-on shows 1500 devices, but I only have 200."

Before v2.5.2, the HA import was run several times while MQTT Discovery was active. The import then pulled back the devices published by the add-on itself — the inventory count doubled with each import. Fix:

1. Update to at least v2.5.2.
2. Expand *Settings → Possible duplicates*, section "Own MQTT devices from an old import", click **Clean up self-imports**. The button moves these entries to the trash; before that, the app creates a snapshot. Other devices are not touched.
3. After 30 days, the app deletes them permanently and automatically. If you are in a hurry: *Settings → Trash* → **Empty trash**.

### "I click 'Upload Document' and end up on the detail page without anything being uploaded."

Bug up to v2.5.3. Fixed from v2.6.0 (`type="button"` on the buttons; otherwise they submit the enclosing form). Update.

### "When I click 'Show in HA', the browser opens and I have to log in to HA again."

This affected the HA Companion app on phones up to v2.5.3. Since v2.6.3, the add-on detects the Companion app and opens the device directly in the Companion app via the deep link `homeassistant://navigate/…`, without a new login.

### "PDF export breaks the layout for a device with long notes."

Bug up to v2.5.3 (fpdf2 + custom header + multi_cell page break). From v2.6.0, notes in the detail section are cut at 1000 characters with the note "... (N chars total — full text in Excel export)". Excel keeps the full text in one cell without layout problems.

### "Where is the license key stored? What happens on an add-on update?"

The license is stored in the add-on data folder as `license.json` (managed by HA). Add-on updates keep it. Reinstallation = re-entry required.

### "Which languages?"

DE, EN, ES, FR, RU. Change it under *Settings → Language*. The Free tier is limited to EN and starts directly in English — Pro unlocks all languages.

---

## Troubleshooting

### The browser blocks the export ("Insecure download blocked")

This happens when you open Home Assistant via an unencrypted address, i.e. `http://<IP>:8123`. Browsers no longer download files from such pages without asking. This is not related to the app — the export is generated and delivered correctly.

**How to get the file:** In the browser's download area, click **Keep**. The file is complete and unchanged.

**How to make the prompt go away permanently:** Open Home Assistant via an encrypted connection — via Home Assistant Cloud (Nabu Casa), via your own certificate with Duck DNS and Let's Encrypt, or via an upstream reverse proxy. After that, the problem no longer occurs.

### Where is my data, and how do I back it up?

Everything the app stores is in the add-on's data directory:

| What | Where |
|---|---|
| Database with all devices | `/data/db/geraeteverwaltung.db` |
| Photos and installation photos | `/data/photos/` |
| Documents | `/data/documents/` |
| Database snapshots | `/data/db/snapshots/` |
| MQTT switch | `/data/db/mqtt_settings.json` |
| License key | `/data/db/license.json` |

You do not need to **back up** anything manually: a Home Assistant backup includes the complete add-on data directory. If you also want to keep the device list outside HA, use *Settings → Export Data → JSON Export*. Before your own changes, *Settings → Database snapshots → Create snapshot now* helps; however, the snapshot is also stored in the add-on data directory.

Do **not** write to the database while the add-on is running. If you open and edit it via Samba or SSH, you risk a corrupted file — the app keeps it open. To view it, stop the add-on first.

### MQTT connection fails

In *Settings → Home Assistant Integration* there is **"Test MQTT connection"**. The button returns a specific error message, with a hint depending on the error code:

- **Code 4 / 5 / 135 (login rejected, "Not authorized")**: Credentials are missing or incorrect. Step by step under [Credentials for the MQTT broker](#credentials-for-the-mqtt-broker).
- **Connection refused**: Is the Mosquitto broker running? Is the port correct (1883 unencrypted, 8883 TLS)?
- **Unreachable / timeout**: Is the hostname/IP correct? With an external broker: the HA network must be able to reach the broker.
- **DNS error**: Check the `mqtt_host` field in the add-on options.

### HA import returns 502 Bad Gateway

Bug up to v2.5.2 — the import ran longer than the HA Ingress HTTP timeout. From v2.5.3, the import runs in the background with progress polling; no more timeout.

### Diagnostic report for a GitHub issue

*Settings → Support & Diagnostics* builds a report with add-on version, architecture, Python version, MQTT status (without credentials), device count and the last 200 log lines. Passwords, tokens and e-mail addresses are removed automatically; for IP addresses, the last two octets are masked. Send it with one click or copy it to the clipboard.

---

## Privacy and legal

**Where the data is stored:** All device data, photos, installation photos and documents stay in your Home Assistant installation (the add-on's data directory). For offline mode, the browser of each device you open the app with also stores the device data and the device photo. Installation photos and documents are stored only on the server, not in the browser. The app contains no tracking and no analytics tools.

**What the add-on sends externally:** Only the license key together with an installation ID to the payment provider Lemon Squeezy — on activation and for occasional checks. Device data leaves your installation only if you export it yourself, send a diagnostic report or publish devices via MQTT to your own broker.

**Warranty:** The software is provided without warranty; the license terms in the GitHub repository apply.

---

## Support and contact

- **Report a bug or request a feature:** [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) → *Issues*. Fastest with the diagnostic report from *Settings → Support & Diagnostics*.
- **Without a GitHub account:** e-mail to support@derregner.info.
- **Exchange with other users:** forum of the simon42 community, thread "Geräteverwaltung".

---

Version v3.1.0 · 2026-10-05. For questions not answered here, open an issue on GitHub or send an e-mail to support@derregner.info — the manual is updated with every version.
