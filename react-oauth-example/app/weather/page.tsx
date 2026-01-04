"use client";

import { useEffect, useState } from "react";

type Forecast = {
  date: string;
  temperatureC: number;
  temperatureF?: number;
  summary?: string;
};

export default function WeatherPage() {
  const [data, setData] = useState<Forecast[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("id_token") : null;
    if (!token) {
      setError("No id token found. Please sign in first.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_BASE_URL
          ? process.env.NEXT_PUBLIC_BACKEND_BASE_URL.replace(/\/$/, "")
          : "http://localhost:5188";

        const res = await fetch(`${base}/weatherforecast`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Fetch failed: ${res.status} ${text}`);
        }

        const json = (await res.json()) as Forecast[];
        setData(json);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e ?? "Failed to fetch weather data");
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (error)
    return (
      <main style={{ padding: 24, color: "#b00020" }}>
        <strong>Error:</strong>
        <div>{error}</div>
      </main>
    );
  if (!data || data.length === 0) return <main style={{ padding: 24 }}>No weather data.</main>;

  const tableStyles: Record<string, React.CSSProperties> = {
    container: {
      padding: 24,
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      color: '#0f172a',
      background: '#f8fafc',
      minHeight: '100vh',
    },
    wrapper: { maxWidth: 980, margin: '0 auto', background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' },
    header: { marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { margin: 0, fontSize: 20 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 16px', background: '#0b1220', color: '#fff', fontSize: 13, fontWeight: 600, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    td: { padding: '12px 16px', borderBottom: '1px solid #eef2f6', verticalAlign: 'middle' },
    summary: { color: '#475569' },
    tempBadge: { display: 'inline-block', padding: '6px 10px', borderRadius: 9999, background: '#eef2ff', color: '#063b7a', fontWeight: 700 },
    smallNote: { color: '#64748b', fontSize: 13 },
  };

  return (
    <main style={tableStyles.container}>
      <div style={tableStyles.wrapper}>
        <div style={tableStyles.header}>
          <h1 style={tableStyles.title}>Weather Forecast</h1>
          <div style={tableStyles.smallNote}>{data.length} records</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Date</th>
                <th style={tableStyles.th}>Summary</th>
                <th style={tableStyles.th}>Temperature</th>
              </tr>
            </thead>
            <tbody>
              {data.map((f, i) => (
                <tr key={i}>
                  <td style={tableStyles.td}>{new Date(f.date).toLocaleString()}</td>
                  <td style={{ ...tableStyles.td, ...tableStyles.summary }}>{f.summary ?? '—'}</td>
                  <td style={tableStyles.td}>
                    <span style={tableStyles.tempBadge}>{f.temperatureC}°C</span>
                    {f.temperatureF != null && (
                      <span style={{ marginLeft: 10, color: '#64748b' }}>{`/ ${f.temperatureF}°F`}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
