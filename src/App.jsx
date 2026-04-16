import { useEffect, useRef, useState } from "react";
import "./App.css";

const TABLE_SIZES = [2, 4, 6, 8, 10];
const STORAGE_KEY = "hale-ohana-layout-tables";
const ZONES_KEY = "hale-ohana-layout-zones";

const DEFAULT_ZONES = [
  {
    id: "hibiscus",
    label: "Hibiscus",
    x: 30,
    y: 140,
    width: 330,
    height: 190,
    rotate: -10,
  },
  {
    id: "bop",
    label: "BOP",
    x: 40,
    y: 280,
    width: 380,
    height: 150,
    rotate: -14,
  },
  {
    id: "crown",
    label: "Crown",
    x: 520,
    y: 260,
    width: 350,
    height: 110,
    rotate: 0,
  },
  {
    id: "gardenia",
    label: "Gardenia",
    x: 980,
    y: 220,
    width: 290,
    height: 120,
    rotate: 0,
  },
  {
    id: "ginger2",
    label: "Ginger 2",
    x: 540,
    y: 430,
    width: 280,
    height: 150,
    rotate: 0,
  },
  {
    id: "centerbar",
    label: "Ginger 1",
    x: 860,
    y: 410,
    width: 290,
    height: 150,
    rotate: 0,
  },
  {
    id: "ilima",
    label: "Ilima",
    x: 1260,
    y: 300,
    width: 150,
    height: 230,
    rotate: 0,
  },
  {
    id: "orchid",
    label: "Orchid",
    x: 1320,
    y: 220,
    width: 260,
    height: 290,
    rotate: 0,
  },
];

function getTableStyle(size, status) {
  const color = status === "occupied" ? "#ef4444" : "#22c55e";

  if (size === 2) {
    return {
      width: 34,
      height: 34,
      background: color,
      borderRadius: "50%",
    };
  }

  if (size === 4) {
    return {
      width: 46,
      height: 46,
      background: color,
      borderRadius: "10px",
    };
  }

  if (size === 6) {
    return {
      width: 60,
      height: 38,
      background: color,
      borderRadius: "10px",
    };
  }

  if (size === 8) {
    return {
      width: 70,
      height: 42,
      background: color,
      borderRadius: "10px",
    };
  }

  return {
    width: 84,
    height: 46,
    background: color,
    borderRadius: "10px",
  };
}

export default function App() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [message, setMessage] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [editingZones, setEditingZones] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [zoneMode, setZoneMode] = useState(null); // drag | resize
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

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  };

  const addTable = (size) => {
    const id = Date.now() + Math.random();

    setTables((prev) => [
      ...prev,
      {
        id,
        size,
        x: 520,
        y: 300,
        status: "available",
      },
    ]);
  };

  const resetLayout = () => {
    setTables([]);
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
  };

  const toggleStatus = (id) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === id
          ? {
              ...table,
              status: table.status === "available" ? "occupied" : "available",
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
        table.id === draggingId
          ? { ...table, x, y }
          : table
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
      <div className="toolbar">
        {TABLE_SIZES.map((size) => (
          <button key={size} onClick={() => addTable(size)}>
            +{size}
          </button>
        ))}
        <button onClick={saveLayout}>Save</button>
        <button onClick={loadLayout}>Load</button>
        <button className="zone-btn" onClick={() => setEditingZones((prev) => !prev)}>
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

      <div className="legend">
        <span className="legend-item">
          <span className="dot green"></span> Available
        </span>
        <span className="legend-item">
          <span className="dot red"></span> Occupied
        </span>
        <span className="hint">
          {editingZones
            ? "Zone mode: drag zone body to move, drag bottom-right handle to resize"
            : "Double click = green/red | Right click = delete"}
        </span>
      </div>

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
    {/* Resize handle */}
    <div
      className="resize-handle"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setActiveZoneId(zone.id);
        setZoneMode("resize");
      }}
    />

    {/* Rotate handle */}
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
              className="table"
              style={{
                ...getTableStyle(table.size, table.status),
                left: `${table.x}px`,
                top: `${table.y}px`,
              }}
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
            >
              {table.size}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}