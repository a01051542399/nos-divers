import { useState, useCallback, useEffect } from "react";
import { TourListScreen } from "./screens/TourList";
import { TourDetailScreen } from "./screens/TourDetail";
import { WaiversTab } from "./screens/WaiversTab";
import { WaiverSignScreen } from "./screens/WaiverSign";
import { WaiverViewScreen } from "./screens/WaiverView";
import { JoinScreen } from "./screens/Join";
import { SettingsScreen } from "./screens/Settings";
import { initTheme } from "./theme";

export type Route =
  | { screen: "tours" }
  | { screen: "tour-detail"; tourId: number }
  | { screen: "waivers" }
  | { screen: "waiver-sign"; tourId: number }
  | { screen: "waiver-view"; tourId: number }
  | { screen: "join" }
  | { screen: "settings" };

type Tab = "tours" | "waivers" | "settings";

function getTabFromRoute(route: Route): Tab {
  switch (route.screen) {
    case "tours":
    case "tour-detail":
    case "join":
      return "tours";
    case "waivers":
    case "waiver-sign":
    case "waiver-view":
      return "waivers";
    case "settings":
      return "settings";
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: "tours" });
  const [refreshKey, setRefreshKey] = useState(0);
  const activeTab = getTabFromRoute(route);

  useEffect(() => { initTheme(); }, []);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    setRefreshKey((k) => k + 1);
  }, []);

  const renderScreen = () => {
    switch (route.screen) {
      case "tours":
        return <TourListScreen key={refreshKey} navigate={navigate} />;
      case "tour-detail":
        return (
          <TourDetailScreen
            key={refreshKey}
            tourId={route.tourId}
            navigate={navigate}
          />
        );
      case "waivers":
        return <WaiversTab key={refreshKey} navigate={navigate} />;
      case "waiver-sign":
        return (
          <WaiverSignScreen
            key={refreshKey}
            tourId={route.tourId}
            navigate={navigate}
          />
        );
      case "waiver-view":
        return (
          <WaiverViewScreen
            key={refreshKey}
            tourId={route.tourId}
            navigate={navigate}
          />
        );
      case "join":
        return <JoinScreen key={refreshKey} navigate={navigate} />;
      case "settings":
        return <SettingsScreen navigate={navigate} />;
    }
  };

  return (
    <>
      <div className="page">{renderScreen()}</div>

      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === "tours" ? "active" : ""}`}
          onClick={() => navigate({ screen: "tours" })}
        >
          <span className="icon">🌊</span>
          <span>투어</span>
        </button>
        <button
          className={`tab-item ${activeTab === "waivers" ? "active" : ""}`}
          onClick={() => navigate({ screen: "waivers" })}
        >
          <span className="icon">📄</span>
          <span>동의서</span>
        </button>
        <button
          className={`tab-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => navigate({ screen: "settings" })}
        >
          <span className="icon">⚙️</span>
          <span>설정</span>
        </button>
      </div>
    </>
  );
}
