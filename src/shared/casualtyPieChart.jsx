import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export function CasualtyPieChart({ deaths, total }) {
  const data = [
    { name: "Deaths", value: Math.max(0, deaths) },
    { name: "Survivors", value: Math.max(0, total - deaths) },
  ];
  const COLORS = ["#ff3b2f", "#00c49f"];

  return (
    <div className="rounded-2xl bg-neutral-800/60 border border-white/10 p-3">
      <div className="text-xs uppercase opacity-60 mb-2">Casualty Breakdown</div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" label>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
