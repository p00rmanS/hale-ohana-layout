import { useEffect, useRef, useState } from "react";
import "./App.css";

const REGULAR_TABLE_SIZES = [1, 2, 4, 6, 8, 10];
const SUPER_TABLE_SIZES = [1, 2, 4];

const STORAGE_KEY = "hale-ohana-layout-tables";
const ZONES_KEY = "hale-ohana-layout-zones";

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

function getTableStyle(size, status, guestType) {
  let fill;

  if (guestType === "Regular") {
    fill = status === "occupied" ? "#ef4444" : "#22c55e";
  } else {
    fill = status === "occupied" ? "#be123c" : "#7c3aed";
  }

  const base = {
    background: fill,
    border: "2px solid rgba(255,255,255,0.95)",
  };

  if (size === 1) {
    return { ...base, width: 28, height: 28, borderRadius: "50%" };
  }

  if (size === 2) {
    return { ...base, width: 34, height: 34, borderRadius: "50%" };
  }

  if (size === 4) {
    return { ...base, width: 46, height: 46, borderRadius: "10px" };
  }

  if (size === 6) {
    return { ...base, width: 60, height: 38, borderRadius: "10px" };
  }

  if (size === 8) {
    return { ...base, width: 70, height: 42, borderRadius: "10px" };
  }

  return { ...base, width: 84, height: 46, borderRadius: "10px" };
}

export default function App() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [message, setMessage] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [editingZones, setEditingZones] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [zoneMode, setZoneMode] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [regularCustomSize, setRegularCustomSize] = useState("");
  const [superCustomSize, setSuperCustomSize] = useState("");
  const floorRef = useRef(null);

  useEffect(() => {
    const savedTables = localStorage.getItem(STORAGE_KEY);
    const savedZones = localStorage.getItem(ZONES_KEY);

    if (savedTables) {
      try {
        setTables(JSON.parse(savedTables));
      } catch (error) {
        console.error("Could not load saved tables:", error);
      }
    }

    if (savedZones) {
      try {
        setZones(JSON.parse(savedZones));
      } catch (error) {
        console.error("Could not load saved zones:", error);
      }
    }
  }, []);

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) || null;

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  };

  const addTable = (size, guestType = "Regular") => {
    const normalizedSize = Number(size);
    if (!normalizedSize || normalizedSize < 1) return;

    const id = Date.now() + Math.random();

    const newTable = {
      id,
      size: normalizedSize,
      x: 520,
      y: 300,
      status: "available",
      fullName: "",
      shortLabel: "",
      guestType,
    };

    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(id);
  };

  const addCustomRegularTable = () => {
    addTable(regularCustomSize, "Regular");
    setRegularCustomSize("");
  };

  const addCustomSuperTable = () => {
    addTable(superCustomSize, "Super");
    setSuperCustomSize("");
  };

  const updateSelectedTable = (field, value) => {
    if (!selectedTableId) return;

    setTables((prev) =>
      prev.map((table) =>
        table.id === selectedTableId
          ? {
              ...table,
              [field]: value,
            }
          : table
      )
    );
  };

  const useInitialsForSelected = () => {
    if (!selectedTable) return;
    updateSelectedTable("shortLabel", getInitials(selectedTable.fullName));
  };

  const clearGuestInfo = () => {
    if (!selectedTableId) return;

    setTables((prev) =>
      prev.map((table) =>
        table.id === selectedTableId
          ? {
              ...table,
              fullName: "",
              shortLabel: "",
              guestType: "Regular",
            }
          : table
      )
    );
  };

  const resetLayout = () => {
    setTables([]);
    setSelectedTableId(null);
    showMessage("Current layout cleared.");
  };

  const saveLayout = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
    showMessage("Layout saved.");
  };

  const loadLayout = () => {
    const savedTables = localStorage.getItem(STORAGE_KEY);
    const savedZones = localStorage.getItem(ZONES_KEY);

    if (savedTables) {
      try {
        setTables(JSON.parse(savedTables));
      } catch (error) {
        console.error(error);
      }
    }

    if (savedZones) {
      try {
        setZones(JSON.parse(savedZones));
      } catch (error) {
        console.error(error);
      }
    }

    showMessage("Saved layout loaded.");
  };

  const clearSavedLayout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ZONES_KEY);
    showMessage("Saved layout deleted.");
  };

  const resetZones = () => {
    setZones(DEFAULT_ZONES);
    showMessage("Zones reset.");
  };

  const deleteTable = (id) => {
    setTables((prev) => prev.filter((table) => table.id !== id));
    if (selectedTableId === id) {
      setSelectedTableId(null);
    }
  };

  const toggleStatus = (id) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === id
          ? {
              ...table,
              status:
                table.status === "available" ? "occupied" : "available",
            }
          : table
      )
    );
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

          const angle =
            Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);

          return {
            rotate: angle,
          };
        });
      }

      return;
    }

    if (draggingId !== null) {
      moveTable(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    setDraggingId(null);
    setActiveZoneId(null);
    setZoneMode(null);
  };

  return (
    <div className="app">
      <div className="page-title-wrap">
        <h1 className="page-title">Hale Ohana Seating Layout</h1>
        <p className="page-subtitle">
          Regular tables on top, Super tables below, then live controls.
        </p>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group-label">Regular</div>
        <div className="toolbar">
          {REGULAR_TABLE_SIZES.map((size) => (
            <button
              key={`regular-${size}`}
              className="regular-btn"
              onClick={() => addTable(size, "Regular")}
            >
              +{size}
            </button>
          ))}

          <input
            className="custom-size-input"
            type="number"
            min="1"
            placeholder="Custom"
            value={regularCustomSize}
            onChange={(e) => setRegularCustomSize(e.target.value)}
          />
          <button className="regular-btn" onClick={addCustomRegularTable}>
            + Custom
          </button>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group-label toolbar-group-label-super">Supers</div>
        <div className="toolbar">
          {SUPER_TABLE_SIZES.map((size) => (
            <button
              key={`super-${size}`}
              className="super-btn"
              onClick={() => addTable(size, "Super")}
            >
              +{size}
            </button>
          ))}

          <input
            className="custom-size-input super-input"
            type="number"
            min="1"
            placeholder="Custom"
            value={superCustomSize}
            onChange={(e) => setSuperCustomSize(e.target.value)}
          />
          <button className="super-btn" onClick={addCustomSuperTable}>
            + Custom
          </button>
        </div>
      </div>

      <div className="controls-row">
        <div className="legend">
          <span className="legend-item">
            <span className="dot green"></span> Available
          </span>
          <span className="legend-item">
            <span className="dot red"></span> Occupied
          </span>
          <span className="legend-item">
            <span className="dot super-dot"></span> Super guest
          </span>
          <span className="hint">
            {editingZones
              ? "Zone mode: drag body to move, blue square to resize, yellow circle to rotate"
              : "Click table to edit guest | Double click = available/occupied | Right click = delete"}
          </span>
        </div>

        <div className="toolbar toolbar-actions">
          <button onClick={saveLayout}>Save</button>
          <button onClick={loadLayout}>Load</button>
          <button
            className="zone-btn"
            onClick={() => setEditingZones((prev) => !prev)}
          >
            {editingZones ? "Done Editing Zones" : "Edit Zones"}
          </button>
          <button onClick={resetZones}>Reset Zones</button>
          <button className="reset-btn" onClick={resetLayout}>
            Reset Tables
          </button>
          <button className="delete-btn" onClick={clearSavedLayout}>
            Clear Saved
          </button>
        </div>
      </div>

      {selectedTable && (
        <div className="editor-panel">
          <div className="editor-title">
            Editing table {selectedTable.size}
          </div>

          <div className="editor-grid">
            <label>
              Full guest name
              <input
                type="text"
                value={selectedTable.fullName}
                onChange={(e) =>
                  updateSelectedTable("fullName", e.target.value)
                }
                placeholder="Anderson Belcher"
              />
            </label>

            <label>
              Short label on table
              <input
                type="text"
                value={selectedTable.shortLabel}
                onChange={(e) =>
                  updateSelectedTable(
                    "shortLabel",
                    e.target.value.toUpperCase().slice(0, 4)
                  )
                }
                placeholder="AB"
              />
            </label>

            <label>
              Guest type
              <select
                value={selectedTable.guestType}
                onChange={(e) =>
                  updateSelectedTable("guestType", e.target.value)
                }
              >
                <option>Regular</option>
                <option>Super</option>
              </select>
            </label>

            <label>
              Status
              <select
                value={selectedTable.status}
                onChange={(e) =>
                  updateSelectedTable("status", e.target.value)
                }
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </label>
          </div>

          <div className="editor-actions">
            <button onClick={useInitialsForSelected}>Use Initials</button>
            <button onClick={clearGuestInfo}>Clear Guest Info</button>
            <button onClick={() => setSelectedTableId(null)}>Done</button>
          </div>
        </div>
      )}

      {message && <div className="message">{message}</div>}

      <div className="floor-shell">
        <div
          className="floor"
          ref={floorRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="fixed cr">CR</div>
          <div className="fixed stage">Stage</div>
          <div className="fixed food">Back Kitchen</div>

          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`zone dynamic-zone ${editingZones ? "editing" : ""}`}
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
                setActiveZoneId(zone.id);
                setZoneMode("drag");
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
                      setActiveZoneId(zone.id);
                      setZoneMode("resize");
                    }}
                  />
                  <div
                    className="rotate-handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveZoneId(zone.id);
                      setZoneMode("rotate");
                    }}
                  />
                </>
              )}
            </div>
          ))}

          {tables.map((table) => (
            <div
              key={table.id}
              className={`table ${
                selectedTableId === table.id ? "table-selected" : ""
              }`}
              style={{
                ...getTableStyle(table.size, table.status, table.guestType),
                left: `${table.x}px`,
                top: `${table.y}px`,
              }}
              onClick={() => setSelectedTableId(table.id)}
              onPointerDown={(e) => {
                if (editingZones) return;
                e.preventDefault();
                setDraggingId(table.id);
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              onDoubleClick={() => toggleStatus(table.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                deleteTable(table.id);
              }}
              title={table.fullName || `Table ${table.size}`}
            >
              {table.shortLabel || table.size}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}