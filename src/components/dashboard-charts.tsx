"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#3b82f6", "#60a5fa", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];

export function SalesBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        ไม่มีข้อมูลยอดขาย
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
        <XAxis dataKey="date" stroke="#1e3a8a" fontSize={12} />
        <YAxis stroke="#1e3a8a" fontSize={12} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
        <Tooltip
          contentStyle={{ backgroundColor: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "12px", boxShadow: "0 4px 12px rgba(249,115,22,0.15)" }}
          labelStyle={{ color: "#1e3a8a", fontWeight: "bold" }}
          formatter={(value: any) => [`${parseFloat(value).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`, "ยอดขาย"]}
        />
        <Legend wrapperStyle={{ color: "#1e3a8a" }} />
        <Bar dataKey="sales" name="ยอดขาย (บาท)" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if ((percent || 0) < 0.05) return null;
  return (
    <text x={x} y={y} fill="#1e3a8a" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontWeight={500}>
      {name} {((percent || 0) * 100).toFixed(0)}%
    </text>
  );
};

export function ProductsPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        ไม่มีข้อมูลสินค้า
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={90}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
          paddingAngle={3}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "12px", boxShadow: "0 4px 12px rgba(249,115,22,0.15)" }}
          formatter={(value: any, _name: any, props: any) => [`${value} ชิ้น (${parseFloat(props.payload.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท)`, props.payload.name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
