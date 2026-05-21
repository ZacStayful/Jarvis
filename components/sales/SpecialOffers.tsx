import { S } from "./styles";
import { KPI } from "./KPI";
import type { OffersData, SalesMetrics } from "./types";

interface Props {
  offers: OffersData;
}

export function SpecialOffers({ offers: o }: Props) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KPI label="Active Offers" value={o.active} sub="Awaiting decision" />
        <KPI
          label="Expiring This Week"
          value={o.expiringThisWeek}
          accent={o.expiringThisWeek > 0 ? S.red : S.green}
          sub={o.expiringThisWeek > 0 ? "Action required" : "All clear"}
        />
        <KPI label="Expiring This Month" value={o.expiringThisMonth} accent={S.amber} />
        <KPI label="Offer Close Rate" value="—" sub="Tracking from setup" />
      </div>
      {o.items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Lead", "Profile", "Offer", "Expiry", "Days Left", "Status"].map((h) => (
                  <th
                    key={h}
                    className="mono"
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: S.textMuted,
                      fontWeight: 500,
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.items.map((item) => {
                const urgent = item.daysLeft !== null && item.daysLeft <= 7;
                const soon = item.daysLeft !== null && item.daysLeft <= 30;
                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: `1px solid rgba(93,129,86,0.06)` }}
                  >
                    <td
                      className="mono"
                      style={{ padding: "10px 12px", fontSize: 11, color: S.text }}
                    >
                      {item.name}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}
                    >
                      {item.profile || "—"}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: "10px 12px", fontSize: 11, color: S.textDim }}
                    >
                      {item.offerType}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: "10px 12px",
                        fontSize: 11,
                        color: urgent
                          ? "#e07070"
                          : soon
                            ? S.amber
                            : S.textDim,
                      }}
                    >
                      {item.expiry || "—"}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: "10px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: urgent
                          ? "#e07070"
                          : soon
                            ? S.amber
                            : S.textDim,
                      }}
                    >
                      {item.daysLeft !== null ? `${item.daysLeft} days` : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 9,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(200,146,42,0.15)",
                          color: S.amber,
                          border: "1px solid rgba(200,146,42,0.3)",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {o.items.length === 0 && (
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: S.textMuted,
            textAlign: "center",
            padding: 20,
          }}
        >
          No active special offers
        </div>
      )}
    </>
  );
}

export function SpecialOffersFromMetrics({ m }: { m: SalesMetrics }) {
  return <SpecialOffers offers={m.offers} />;
}
