import { useEffect, useRef, useState } from "react";
import "./App.css";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

const REGULAR_TABLE_SIZES = [1, 2, 4, 6, 8, 10];
const SUPER_TABLE_SIZES = [1, 2, 4];
const LARGE_PARTY_SIZES = [14, 15, 16, 18, 19, 20, 25];

const STORAGE_KEY = "hale-ohana-layout-tables";
const ZONES_KEY = "hale-ohana-layout-zones";
const SERVER_KEY = "hale-ohana-layout-servers";
const FIREBASE_LAYOUT_PATH = "layouts/main";

const SERVER_COLORS = [
  { name: "None", value: "" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#0d9488" },
  { name: "Gold", value: "#ca8a04" },
  { name: "Black", value: "#111827" },
];

const DEFAULT_ZONES = [
  { id: "hibiscus", label: "Hibiscus", x: 30, y: 140, width: 330, height: 190, rotate: -10 },
  { id: "bop", label: "BOP", x: 40, y: 280, width: 380, height: 150, rotate: -14 },
  { id: "crown", label: "Crown", x: 520, y: 260, width: 350, height: 110, rotate: 0 },
  { id: "gardenia", label: "Gardenia", x: 980, y: 220, width: 290, height: 120, rotate: 0 },
  { id: "ginger2", label: "Ginger 2", x: 540, y: 430, width: 280, height: 150, rotate: 0 },
  { id: "centerbar", label: "Ginger 1", x: 860, y: 410, width: 290, height: 150, rotate: 0 },
  { id: "ilima", label: "Ilima", x: 1260, y: 300, width: 150, height: 230, rotate: 0 },
  { id: "orchid", label: "Orchid", x: 1320, y: 220, width: 260, height: 290, rotate: 0 },
];

function getInitials(name) {
  if (!name.trim()) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function getTableStyle(size, status, guestType, serverColor) {
  let fill;

  if (guestType === "Regular") {
    fill = status === "occupied" ? "#ef4444" : "#22c55e";
  } else {
    fill = status === "occupied" ? "#be123c" : "#7c3aed";
  }

  const base = {
    background: fill,
    border: `2px solid ${serverColor || "rgba(255,255,255,0.95)"}`,
    boxShadow: serverColor
      ? `0 0 0 3px ${serverColor}, 0 6px 14px rgba(0, 0, 0, 0.18)`
      : "0 6px 14px rgba(0, 0, 0, 0.18)",
  };

  if (size === 1) return { ...base, width: 28, height: 28, borderRadius: "50%" };
  if (size === 2) return { ...base, width: 34, height: 34, borderRadius: "50%" };
  if (size === 4) return { ...base, width: 46, height: 46, borderRadius: "10px" };
  if (size === 6) return { ...base, width: 60, height: 38, borderRadius: "10px" };
  if (size === 8) return { ...base, width: 70, height: 42, borderRadius: "10px" };
  if (size === 10) return { ...base, width: 84, height: 46, borderRadius: "10px" };

  return {
    ...base,
    width: Math.min(190, 90 + size * 4),
    height: 58,
    borderRadius: "12px",
  };
}

export default function App() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [message, setMessage] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [editingZones, setEditingZones] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [zoneMode, setZoneMode] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);

  const [regularCustomSize, setRegularCustomSize] = useState("");
  const [superCustomSize, setSuperCustomSize] = useState("");
  const [dailySetupRows, setDailySetupRows] = useState([
    { pax: 2, count: 9 },
    { pax: 4, count: 14 },
    { pax: 6, count: 6 },
    { pax: 8, count: 5 },
    { pax: 10, count: 2 },
    { pax: 11, count: 1 },
  ]);
  
  const [builderPartySize, setBuilderPartySize] = useState("20");
  const [builderPhysicalTables, setBuilderPhysicalTables] = useState("3");
  const [builderBookedName, setBuilderBookedName] = useState("");
  const [builderShortLabel, setBuilderShortLabel] = useState("");
  const [builderServerInitials, setBuilderServerInitials] = useState("");
  const [builderGuestType, setBuilderGuestType] = useState("Regular");
  const [builderServerColor, setBuilderServerColor] = useState("");
  const [builderShowServer, setBuilderShowServer] = useState(false);
  const [builderShowTableCount, setBuilderShowTableCount] = useState(false);

  const [newAreaName, setNewAreaName] = useState("");
  const [selectedAreaName, setSelectedAreaName] = useState("");

  const [servers, setServers] = useState([]);
  const [serverNameInput, setServerNameInput] = useState("");
  const [serverInitialsInput, setServerInitialsInput] = useState("");
  const [serverColorInput, setServerColorInput] = useState("#2563eb");

  const floorRef = useRef(null);
  const latestTablesRef = useRef([]);
  const latestZonesRef = useRef(DEFAULT_ZONES);
  const latestServersRef = useRef([]);

  const layoutRef = ref(db, FIREBASE_LAYOUT_PATH);
  const isInteractingRef = useRef(false);
  const ignoreNextRemoteRef = useRef(false);

  useEffect(() => {
    latestTablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    latestZonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    latestServersRef.current = servers;
  }, [servers]);

  useEffect(() => {
    const savedTables = localStorage.getItem(STORAGE_KEY);
    const savedZones = localStorage.getItem(ZONES_KEY);
    const savedServers = localStorage.getItem(SERVER_KEY);
    
    if (savedTables) {
      try {
        setTables(JSON.parse(savedTables));
      } catch (error) {
        console.error("Could not load saved tables:", error);
      }
    }

    if (savedZones) {
      try {
        const parsedZones = JSON.parse(savedZones);
        setZones(parsedZones);
      } catch (error) {
        console.error("Could not load saved zones:", error);
      }
    }

    if (savedServers) {
      try {
        setServers(JSON.parse(savedServers));
      } catch (error) {
        console.error("Could not load saved servers:", error);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(layoutRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (ignoreNextRemoteRef.current) {
        ignoreNextRemoteRef.current = false;
        return;
      }

      if (isInteractingRef.current) return;

      if (data.tables) {
        setTables(data.tables);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tables));
      }

      if (data.zones) {
        setZones(data.zones);
        localStorage.setItem(ZONES_KEY, JSON.stringify(data.zones));
      }

      if (data.servers) {
        setServers(data.servers);
        localStorage.setItem(SERVER_KEY, JSON.stringify(data.servers));
      }
    });

    return () => unsubscribe();
  }, []);

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) || null;

  const selectedZone =
    zones.find((zone) => zone.id === selectedZoneId) || null;

  const serverWorkloads = servers.map((server) => {
    const assignedTables = tables.filter(
      (table) => table.serverInitials === server.initials
    );

    return {
      ...server,
      tableCount: assignedTables.length,
      guestCount: assignedTables.reduce(
        (total, table) => total + Number(table.partySize || table.size || 0),
        0
      ),
    };
  });

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  };

  const syncToFirebase = async (
    nextTables,
    nextZones,
    showSavedMessage = false,
    nextServers = latestServersRef.current
  ) => {
    try {
      ignoreNextRemoteRef.current = true;
      await set(layoutRef, {
        tables: nextTables,
        zones: nextZones,
        servers: nextServers,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTables));
      localStorage.setItem(ZONES_KEY, JSON.stringify(nextZones));
      localStorage.setItem(SERVER_KEY, JSON.stringify(nextServers));
      if (showSavedMessage) showMessage("Live layout saved.");
    } catch (error) {
      console.error("Firebase sync error:", error);
      showMessage("Firebase sync failed.");
    }
  };

  const addServer = () => {
    const initials = serverInitialsInput.trim().toUpperCase().slice(0, 2);
    const name = serverNameInput.trim();

    if (!initials) {
      showMessage("Enter server initials.");
      return;
    }

    const newServer = {
      id: Date.now() + Math.random(),
      initials,
      name: name || initials,
      color: serverColorInput || "#2563eb",
    };

    const withoutDuplicate = servers.filter(
      (server) => server.initials !== initials
    );

    const nextServers = [...withoutDuplicate, newServer];
    setServers(nextServers);
    setServerNameInput("");
    setServerInitialsInput("");
    syncToFirebase(tables, zones, true, nextServers);
  };

  const removeServer = (serverInitials) => {
    const nextServers = servers.filter(
      (server) => server.initials !== serverInitials
    );

    const nextTables = tables.map((table) =>
      table.serverInitials === serverInitials
        ? {
            ...table,
            serverInitials: "",
            serverColor: "",
            showServerOnTable: false,
          }
        : table
    );

    setServers(nextServers);
    setTables(nextTables);
    syncToFirebase(nextTables, zones, true, nextServers);
  };

  const assignSelectedTableToServer = (server) => {
    if (!selectedTableId) {
      showMessage("Select a table first.");
      return;
    }

    const nextTables = tables.map((table) =>
      table.id === selectedTableId
        ? {
            ...table,
            serverInitials: server.initials,
            serverColor: server.color,
            showServerOnTable: true,
          }
        : table
    );

    setTables(nextTables);
    syncToFirebase(nextTables, zones);
    showMessage(`Assigned to ${server.initials}.`);
  };

  const clearServerFromSelectedTable = () => {
    if (!selectedTableId) {
      showMessage("Select a table first.");
      return;
    }

    const nextTables = tables.map((table) =>
      table.id === selectedTableId
        ? {
            ...table,
            serverInitials: "",
            serverColor: "",
            showServerOnTable: false,
          }
        : table
    );

    setTables(nextTables);
    syncToFirebase(nextTables, zones);
  };

  const clearAllServerAssignments = () => {
    const nextTables = tables.map((table) => ({
      ...table,
      serverInitials: "",
      serverColor: "",
      showServerOnTable: false,
    }));

    setTables(nextTables);
    syncToFirebase(nextTables, zones, true);
  };

  const addTable = (size, guestType = "Regular", overrides = {}) => {
    const normalizedSize = Number(size);
    if (!normalizedSize || normalizedSize < 1) return;

    const id = Date.now() + Math.random();

    const newTable = {
      id,
      size: normalizedSize,
      partySize: normalizedSize,
      physicalTables: 1,
      serverInitials: "",
      serverColor: "",
      showServerOnTable: false,
      showTableCountOnTable: false,
      bookedName: "",
      x: 520,
      y: 300,
      status: "available",
      fullName: "",
      shortLabel: "",
      guestType,
      ...overrides,
    };

    const nextTables = [...tables, newTable];
    setTables(nextTables);
    setSelectedTableId(id);
    syncToFirebase(nextTables, zones);
  };

  const addCustomRegularTable = () => {
    addTable(regularCustomSize, "Regular");
    setRegularCustomSize("");
  };

  const addCustomSuperTable = () => {
    addTable(superCustomSize, "Super");
    setSuperCustomSize("");
  };

  const createLargeParty = () => {
    const partySize = Number(builderPartySize);
    const physicalTables = Number(builderPhysicalTables);

    if (!partySize || partySize < 1) {
      showMessage("Enter a valid party size.");
      return;
    }

    const bookedName = builderBookedName.trim();
    const shortLabel =
      builderShortLabel.trim().toUpperCase().slice(0, 4) ||
      getInitials(bookedName);

    addTable(partySize, builderGuestType, {
      partySize,
      physicalTables: physicalTables || 1,
      bookedName,
      fullName: bookedName,
      shortLabel,
      serverInitials: builderServerInitials.toUpperCase().slice(0, 2),
      serverColor: builderServerColor,
      showServerOnTable: builderShowServer,
      showTableCountOnTable: builderShowTableCount,
    });

    showMessage("Large party created.");
  };

  const addCustomArea = () => {
    const label = newAreaName.trim() || "New Area";
    const id = `custom-area-${Date.now()}`;

    const newZone = {
      id,
      label,
      x: 300,
      y: 300,
      width: 260,
      height: 150,
      rotate: 0,
      custom: true,
    };

    const nextZones = [...zones, newZone];
    setZones(nextZones);
    setSelectedZoneId(id);
    setSelectedAreaName(label);
    setEditingZones(true);
    setNewAreaName("");
    syncToFirebase(tables, nextZones, true);
  };

  const renameSelectedArea = () => {
    if (!selectedZoneId) {
      showMessage("Select an area first.");
      return;
    }

    const label = selectedAreaName.trim();
    if (!label) {
      showMessage("Enter an area name.");
      return;
    }

    const nextZones = zones.map((zone) =>
      zone.id === selectedZoneId ? { ...zone, label } : zone
    );

    setZones(nextZones);
    syncToFirebase(tables, nextZones, true);
  };

  const deleteSelectedArea = () => {
    if (!selectedZoneId) {
      showMessage("Select an area first.");
      return;
    }

    const nextZones = zones.filter((zone) => zone.id !== selectedZoneId);
    setZones(nextZones);
    setSelectedZoneId(null);
    setSelectedAreaName("");
    syncToFirebase(tables, nextZones, true);
  };

  const updateSelectedTable = (field, value) => {
    if (!selectedTableId) return;

    const nextTables = tables.map((table) =>
      table.id === selectedTableId ? { ...table, [field]: value } : table
    );

    setTables(nextTables);
    syncToFirebase(nextTables, zones);
  };

  const useInitialsForSelected = () => {
    if (!selectedTable) return;
    const nameToUse = selectedTable.bookedName || selectedTable.fullName;
    updateSelectedTable("shortLabel", getInitials(nameToUse));
  };

  const clearGuestInfo = () => {
    if (!selectedTableId) return;

    const nextTables = tables.map((table) =>
      table.id === selectedTableId
        ? {
          ...table,
          fullName: "",
          bookedName: "",
          shortLabel: "",
          serverInitials: "",
          serverColor: "",
          showServerOnTable: false,
          showTableCountOnTable: false,
          guestType: "Regular",
        }
        : table
    );

    setTables(nextTables);
    syncToFirebase(nextTables, zones);
  };

  const resetLayout = () => {
    setTables([]);
    setSelectedTableId(null);
    syncToFirebase([], zones, true);
  };

  const saveLayout = () => {
    syncToFirebase(tables, zones, true);
  };

  const loadLayout = () => {
    const savedTables = localStorage.getItem(STORAGE_KEY);
    const savedZones = localStorage.getItem(ZONES_KEY);
    const savedServers = localStorage.getItem(SERVER_KEY);

    let nextTables = tables;
    let nextZones = zones;
    let nextServers = servers;

    if (savedTables) {
      try {
        nextTables = JSON.parse(savedTables);
        setTables(nextTables);
      } catch (error) {
        console.error(error);
      }
    }

    if (savedZones) {
      try {
        nextZones = JSON.parse(savedZones);
        setZones(nextZones);
      } catch (error) {
        console.error(error);
      }
    }

    if (savedServers) {
      try {
        nextServers = JSON.parse(savedServers);
        setServers(nextServers);
      } catch (error) {
        console.error(error);
      }
    }

    syncToFirebase(nextTables, nextZones, true, nextServers);
  };

  const clearSavedLayout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ZONES_KEY);
    localStorage.removeItem(SERVER_KEY);
    showMessage("Local backup deleted.");
  };

  const resetZones = () => {
    setZones(DEFAULT_ZONES);
    setSelectedZoneId(null);
    setSelectedAreaName("");
    syncToFirebase(tables, DEFAULT_ZONES, true);
  };

  const deleteTable = (id) => {
    const nextTables = tables.filter((table) => table.id !== id);
    setTables(nextTables);
    if (selectedTableId === id) setSelectedTableId(null);
    syncToFirebase(nextTables, zones);
  };

  const duplicateSelectedTable = () => {
    if (!selectedTable) return;

    const duplicated = {
      ...selectedTable,
      id: Date.now() + Math.random(),
      x: selectedTable.x + 30,
      y: selectedTable.y + 30,
    };

    const nextTables = [...tables, duplicated];
    setTables(nextTables);
    setSelectedTableId(duplicated.id);
    syncToFirebase(nextTables, zones);
  };

  const toggleStatus = (id) => {
    const nextTables = tables.map((table) =>
      table.id === id
        ? {
          ...table,
          status: table.status === "available" ? "occupied" : "available",
        }
        : table
    );

    setTables(nextTables);
    syncToFirebase(nextTables, zones);
  };

  const moveTable = (clientX, clientY) => {
    if (draggingId === null || !floorRef.current) return;

    const rect = floorRef.current.getBoundingClientRect();
    const x = clientX - rect.left - 20;
    const y = clientY - rect.top - 20;

    setTables((prev) =>
      prev.map((table) =>
        table.id === draggingId ? { ...table, x, y } : table
      )
    );
  };

  const updateZone = (zoneId, updater) => {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id === zoneId ? { ...zone, ...updater(zone) } : zone
      )
    );
  };

  const handlePointerMove = (e) => {
    if (editingZones && activeZoneId && floorRef.current) {
      const rect = floorRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (zoneMode === "drag") {
        updateZone(activeZoneId, (zone) => ({
          x: x - zone.width / 2,
          y: y - zone.height / 2,
        }));
      }

      if (zoneMode === "resize") {
        updateZone(activeZoneId, (zone) => ({
          width: Math.max(80, x - zone.x),
          height: Math.max(60, y - zone.y),
        }));
      }

      if (zoneMode === "rotate") {
        updateZone(activeZoneId, (zone) => {
          const centerX = zone.x + zone.width / 2;
          const centerY = zone.y + zone.height / 2;
          const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
          return { rotate: angle };
        });
      }

      return;
    }

    if (draggingId !== null) {
      moveTable(e.clientX, e.clientY);
    }
  };

  const updateDailySetupRow = (index, field, value) => {
    setDailySetupRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
            ...row,
            [field]: Number(value),
          }
          : row
      )
    );
  };

  const generateDailyTables = () => {
    const newTables = [];
    let x = 520;
    let y = 300;
    let column = 0;

    dailySetupRows.forEach((row) => {
      const pax = Number(row.pax);
      const count = Number(row.count);

      if (!pax || !count) return;

      for (let i = 0; i < count; i++) {
        newTables.push({
          id: Date.now() + Math.random() + newTables.length,
          size: pax,
          partySize: pax,
          physicalTables: 1,
          serverInitials: "",
          serverColor: "",
          showServerOnTable: false,
          showTableCountOnTable: false,
          bookedName: "",
          x: x + column * 95,
          y,
          status: "available",
          fullName: "",
          shortLabel: "",
          guestType: "Regular",
        });

        column++;

        if (column >= 8) {
          column = 0;
          y += 75;
        }
      }

      column = 0;
      y += 90;
    });

    if (newTables.length === 0) {
      showMessage("Enter at least one table count.");
      return;
    }

    const nextTables = [...tables, ...newTables];
    setTables(nextTables);
    syncToFirebase(nextTables, zones, true);
    showMessage(`${newTables.length} tables generated.`);
  };

  const clearDailySetupCounts = () => {
    setDailySetupRows((prev) =>
      prev.map((row) => ({
        ...row,
        count: 0,
      }))
    );
  };
  const handlePointerUp = () => {
    const finishedDraggingTable = draggingId !== null;
    const finishedEditingZone = activeZoneId !== null;

    setDraggingId(null);
    setActiveZoneId(null);
    setZoneMode(null);
    isInteractingRef.current = false;

    if (finishedDraggingTable || finishedEditingZone) {
      setTimeout(() => {
        syncToFirebase(latestTablesRef.current, latestZonesRef.current);
      }, 0);
    }
  };

  return (
    <div className="app">
      <div className="page-title-wrap">
        <h1 className="page-title">Hale Ohana Seating Layout</h1>
        <p className="page-subtitle">
          Regular, Supers, large parties, server colors, custom areas, and live seating controls.
        </p>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group-label">Regular</div>
        <div className="toolbar">
          {REGULAR_TABLE_SIZES.map((size) => (
            <button key={`regular-${size}`} className="regular-btn" onClick={() => addTable(size, "Regular")}>
              +{size}
            </button>
          ))}

          <input className="custom-size-input" type="number" min="1" placeholder="Custom" value={regularCustomSize} onChange={(e) => setRegularCustomSize(e.target.value)} />
          <button className="regular-btn" onClick={addCustomRegularTable}>+ Custom</button>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group-label toolbar-group-label-super">Supers</div>
        <div className="toolbar">
          {SUPER_TABLE_SIZES.map((size) => (
            <button key={`super-${size}`} className="super-btn" onClick={() => addTable(size, "Super")}>
              +{size}
            </button>
          ))}

          <input className="custom-size-input super-input" type="number" min="1" placeholder="Custom" value={superCustomSize} onChange={(e) => setSuperCustomSize(e.target.value)} />
          <button className="super-btn" onClick={addCustomSuperTable}>+ Custom</button>
        </div>
      </div>

      <div className="daily-setup-builder">
        <div>
          <div className="toolbar-group-label daily-setup-label">
            Daily Setup Generator
          </div>
          <p>
            Enter today’s table counts from the daily setup sheet, then generate all tables at once.
          </p>
        </div>

        <div className="daily-setup-grid">
          {dailySetupRows.map((row, index) => (
            <div className="daily-setup-card" key={index}>
              <label>
                Pax
                <input
                  type="number"
                  min="1"
                  value={row.pax}
                  onChange={(e) =>
                    updateDailySetupRow(index, "pax", e.target.value)
                  }
                />
              </label>

              <label>
                Tables
                <input
                  type="number"
                  min="0"
                  value={row.count}
                  onChange={(e) =>
                    updateDailySetupRow(index, "count", e.target.value)
                  }
                />
              </label>
            </div>
          ))}
        </div>

        <div className="daily-setup-actions">
          <button className="daily-setup-btn" onClick={generateDailyTables}>
            Generate Daily Tables
          </button>
          <button className="delete-btn" onClick={clearDailySetupCounts}>
            Clear Counts
          </button>
        </div>
      </div>

      <div className="server-panel">
        <div>
          <div className="toolbar-group-label server-panel-label">
            Daily Server Panel
          </div>
          <p>
            Add only today’s servers, assign selected tables, and balance workload by tables and guests.
          </p>
        </div>

        <div className="server-panel-grid">
          <label>
            Initials
            <input
              type="text"
              maxLength="2"
              value={serverInitialsInput}
              onChange={(e) =>
                setServerInitialsInput(e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="AL"
            />
          </label>

          <label>
            Full name
            <input
              type="text"
              value={serverNameInput}
              onChange={(e) => setServerNameInput(e.target.value)}
              placeholder="Alyssa"
            />
          </label>

          <label>
            Color
            <select
              value={serverColorInput}
              onChange={(e) => setServerColorInput(e.target.value)}
            >
              {SERVER_COLORS.filter((color) => color.value).map((color) => (
                <option key={color.name} value={color.value}>
                  {color.name}
                </option>
              ))}
            </select>
          </label>

          <button className="server-add-btn" onClick={addServer}>
            Add / Update Server
          </button>
        </div>

        <div className="server-chip-list">
          {serverWorkloads.length === 0 && (
            <span className="server-empty">No servers added yet.</span>
          )}

          {serverWorkloads.map((server) => (
            <div
              className="server-chip"
              key={server.initials}
              style={{ borderColor: server.color }}
            >
              <div className="server-chip-main">
                <span
                  className="server-color-dot"
                  style={{ background: server.color }}
                ></span>
                <strong>{server.initials}</strong>
                <span>{server.name}</span>
              </div>

              <div className="server-chip-stats">
                {server.tableCount} tables · {server.guestCount} guests
              </div>

              <div className="server-chip-actions">
                <button onClick={() => assignSelectedTableToServer(server)}>
                  Assign selected
                </button>
                <button
                  className="mini-delete-btn"
                  onClick={() => removeServer(server.initials)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="server-panel-actions">
          <button className="server-clear-btn" onClick={clearServerFromSelectedTable}>
            Clear selected server
          </button>
          <button className="delete-btn" onClick={clearAllServerAssignments}>
            Clear all server assignments
          </button>
        </div>
      </div>

      <div className="large-party-builder">
        <div className="large-party-builder-header">
          <div>
            <div className="toolbar-group-label large-party-label">Large Party Builder</div>
            <p>Create one clean group block, with optional server/table-count display.</p>
          </div>
        </div>

        <div className="large-party-presets">
          {LARGE_PARTY_SIZES.map((size) => (
            <button key={`large-${size}`} className="large-party-btn" onClick={() => setBuilderPartySize(String(size))}>
              {size}p
            </button>
          ))}
        </div>

        <div className="large-party-grid">
          <label>
            Party size
            <input type="number" min="1" value={builderPartySize} onChange={(e) => setBuilderPartySize(e.target.value)} />
          </label>

          <label>
            Physical tables
            <input type="number" min="1" value={builderPhysicalTables} onChange={(e) => setBuilderPhysicalTables(e.target.value)} />
          </label>

          <label>
            Booked name
            <input type="text" value={builderBookedName} onChange={(e) => setBuilderBookedName(e.target.value)} placeholder="Anderson Belcher" />
          </label>

          <label>
            Initials
            <input type="text" maxLength="4" value={builderShortLabel} onChange={(e) => setBuilderShortLabel(e.target.value.toUpperCase().slice(0, 4))} placeholder="AB" />
          </label>

          <label>
            Server
            <input type="text" maxLength="2" value={builderServerInitials} onChange={(e) => setBuilderServerInitials(e.target.value.toUpperCase().slice(0, 2))} placeholder="JD" />
          </label>

          <label>
            Type
            <select value={builderGuestType} onChange={(e) => setBuilderGuestType(e.target.value)}>
              <option>Regular</option>
              <option>Super</option>
            </select>
          </label>

          <label>
            Server color
            <select value={builderServerColor} onChange={(e) => setBuilderServerColor(e.target.value)}>
              {SERVER_COLORS.map((color) => (
                <option key={color.name} value={color.value}>{color.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="large-party-options">
          <label>
            <input type="checkbox" checked={builderShowServer} onChange={(e) => setBuilderShowServer(e.target.checked)} />
            Show server on table
          </label>

          <label>
            <input type="checkbox" checked={builderShowTableCount} onChange={(e) => setBuilderShowTableCount(e.target.checked)} />
            Show table count on table
          </label>

          <button className="large-party-btn" onClick={createLargeParty}>Create Large Party</button>
        </div>
      </div>

      <div className="area-builder">
        <div>
          <div className="toolbar-group-label area-builder-label">Custom Area Creator</div>
          <p>Add a temporary/custom area, then use Edit Zones to move, resize, or rotate it.</p>
        </div>

        <div className="area-builder-row">
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="New area name"
          />
          <button className="area-btn" onClick={addCustomArea}>+ Add Area</button>

          <input
            type="text"
            value={selectedAreaName}
            onChange={(e) => setSelectedAreaName(e.target.value)}
            placeholder="Selected area name"
          />
          <button className="zone-btn" onClick={renameSelectedArea}>Rename Selected</button>
          <button className="delete-btn" onClick={deleteSelectedArea}>Delete Selected Area</button>
        </div>

        <div className="area-builder-note">
          Selected area: <strong>{selectedZone ? selectedZone.label : "None"}</strong>
        </div>
      </div>

      <div className="controls-row">
        <div className="legend">
          <span className="legend-item"><span className="dot green"></span> Regular Available</span>
          <span className="legend-item"><span className="dot red"></span> Regular Occupied</span>
          <span className="legend-item"><span className="dot super-dot"></span> Super Available</span>
          <span className="hint">
            {editingZones
              ? "Zone mode: click area to select, drag body to move, blue square to resize, yellow circle to rotate"
              : "Click table to edit guest | Double click = available/occupied | Right click = delete | Live sync is on"}
          </span>
        </div>

        <div className="toolbar toolbar-actions">
          <button onClick={saveLayout}>Save Live</button>
          <button onClick={loadLayout}>Load Local</button>
          <button className="zone-btn" onClick={() => setEditingZones((prev) => !prev)}>
            {editingZones ? "Done Editing Zones" : "Edit Zones"}
          </button>
          <button onClick={resetZones}>Reset Zones</button>
          <button className="reset-btn" onClick={resetLayout}>Reset Tables</button>
          <button className="delete-btn" onClick={clearSavedLayout}>Clear Local</button>
        </div>
      </div>

      {selectedTable && (
        <div className="editor-panel">
          <div className="editor-title">Editing party {selectedTable.partySize || selectedTable.size}</div>

          <div className="editor-grid">
            <label>
              Booked under / full guest name
              <input
                type="text"
                value={selectedTable.bookedName || selectedTable.fullName || ""}
                onChange={(e) => {
                  updateSelectedTable("bookedName", e.target.value);
                  updateSelectedTable("fullName", e.target.value);
                }}
                placeholder="Anderson Belcher"
              />
            </label>

            <label>
              Short label on table
              <input
                type="text"
                value={selectedTable.shortLabel}
                onChange={(e) => updateSelectedTable("shortLabel", e.target.value.toUpperCase().slice(0, 4))}
                placeholder="AB"
              />
            </label>

            <label>
              Party size
              <input
                type="number"
                min="1"
                value={selectedTable.partySize || selectedTable.size}
                onChange={(e) => {
                  updateSelectedTable("partySize", Number(e.target.value));
                  updateSelectedTable("size", Number(e.target.value));
                }}
              />
            </label>

            <label>
              Physical tables
              <input
                type="number"
                min="1"
                value={selectedTable.physicalTables || 1}
                onChange={(e) => updateSelectedTable("physicalTables", Number(e.target.value))}
              />
            </label>

            <label>
              Server initials
              <input
                type="text"
                maxLength="2"
                value={selectedTable.serverInitials || ""}
                onChange={(e) => updateSelectedTable("serverInitials", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="JD"
              />
            </label>

            <label>
              Server color
              <select value={selectedTable.serverColor || ""} onChange={(e) => updateSelectedTable("serverColor", e.target.value)}>
                {SERVER_COLORS.map((color) => (
                  <option key={color.name} value={color.value}>{color.name}</option>
                ))}
              </select>
            </label>

            <label>
              Guest type
              <select value={selectedTable.guestType} onChange={(e) => updateSelectedTable("guestType", e.target.value)}>
                <option>Regular</option>
                <option>Super</option>
              </select>
            </label>

            <label>
              Status
              <select value={selectedTable.status} onChange={(e) => updateSelectedTable("status", e.target.value)}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </label>
          </div>

          <div className="editor-actions editor-checks">
            <label>
              <input
                type="checkbox"
                checked={!!selectedTable.showServerOnTable}
                onChange={(e) => updateSelectedTable("showServerOnTable", e.target.checked)}
              />
              Show server
            </label>

            <label>
              <input
                type="checkbox"
                checked={!!selectedTable.showTableCountOnTable}
                onChange={(e) => updateSelectedTable("showTableCountOnTable", e.target.checked)}
              />
              Show table count
            </label>

            <button onClick={useInitialsForSelected}>Use Initials</button>
            <button onClick={duplicateSelectedTable}>Duplicate</button>
            <button onClick={clearGuestInfo}>Clear Guest Info</button>
            <button onClick={() => setSelectedTableId(null)}>Done</button>
          </div>
        </div>
      )}

      {message && <div className="message">{message}</div>}

      <div className="floor-shell">
        <div className="floor" ref={floorRef} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          <div className="fixed cr">CR</div>
          <div className="fixed stage">Stage</div>
          <div className="fixed food">Back Kitchen</div>

          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`zone dynamic-zone ${editingZones ? "editing" : ""} ${selectedZoneId === zone.id ? "zone-selected" : ""}`}
              style={{
                left: `${zone.x}px`,
                top: `${zone.y}px`,
                width: `${zone.width}px`,
                height: `${zone.height}px`,
                transform: `rotate(${zone.rotate}deg)`,
              }}
              onPointerDown={(e) => {
                if (!editingZones) return;
                e.preventDefault();
                isInteractingRef.current = true;
                setSelectedZoneId(zone.id);
                setSelectedAreaName(zone.label);
                setActiveZoneId(zone.id);
                setZoneMode("drag");
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
            >
              {zone.label}

              {editingZones && (
                <>
                  <div
                    className="resize-handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      isInteractingRef.current = true;
                      setSelectedZoneId(zone.id);
                      setSelectedAreaName(zone.label);
                      setActiveZoneId(zone.id);
                      setZoneMode("resize");
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                  />
                  <div
                    className="rotate-handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      isInteractingRef.current = true;
                      setSelectedZoneId(zone.id);
                      setSelectedAreaName(zone.label);
                      setActiveZoneId(zone.id);
                      setZoneMode("rotate");
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                  />
                </>
              )}
            </div>
          ))}

          {tables.map((table) => (
            <div
              key={table.id}
              className={`table ${selectedTableId === table.id ? "table-selected" : ""}`}
              style={{
                ...getTableStyle(table.size, table.status, table.guestType, table.serverColor),
                left: `${table.x}px`,
                top: `${table.y}px`,
              }}
              onClick={() => setSelectedTableId(table.id)}
              onPointerDown={(e) => {
                if (editingZones) return;
                e.preventDefault();
                isInteractingRef.current = true;
                setDraggingId(table.id);
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              onDoubleClick={() => toggleStatus(table.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteTable(table.id);
              }}
              title={table.bookedName || table.fullName || `Party ${table.partySize || table.size}`}
            >
              <span className="table-label-main">{table.shortLabel || table.size}</span>
              <span className="table-label-sub">{table.partySize || table.size}p</span>
              {(table.showServerOnTable || table.showTableCountOnTable) && (
                <span className="table-label-extra">
                  {table.showTableCountOnTable ? `${table.physicalTables || 1}T` : ""}
                  {table.showTableCountOnTable && table.showServerOnTable && table.serverInitials ? " · " : ""}
                  {table.showServerOnTable ? table.serverInitials : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}