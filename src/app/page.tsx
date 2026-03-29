'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingDown, AlertTriangle, ArrowUpRight, Activity, Banknote, ShoppingBag, Download, FileSpreadsheet, FileText, BarChart3, Box } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SKU {
  id: string;
  code: string;
  name: string;
  quantity: number;
  srp: number;
  lowStockThreshold: number;
}

interface TransactionItem {
  id: string;
  skuId: string;
  sku: SKU;
  quantity: number;
}

interface Transaction {
  id: string;
  type: 'SHOP_OUT' | 'REVERSAL';
  status: 'COMPLETED' | 'CANCELLED';
  userId: string;
  user?: { name: string };
  userName?: string;
  createdAt: string;
  items: TransactionItem[];
}

interface SkuContribution {
  id: string;
  code: string;
  name: string;
  qtySold: number;
  currentStock: number;
  revenue: number;
  percentage: number;
}

interface Stats {
  totalSkus: number;
  lowStockItems: number;
  totalTransactions: number;
  totalUsers: number;
  totalRevenue: number;
  totalItemsSold: number;
  averageTransactionValue: number;
  totalStock: number;
  skuContributions: SkuContribution[];
  recentActivity: Transaction[];
}

function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      
      if (res.ok) {
        setStats(data);
      } else {
        console.error('Failed to fetch dashboard stats:', data.error);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStoreName(localStorage.getItem('store_name'));
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const exportToExcel = () => {
    if (!stats) return;
    const wsData = stats.skuContributions.map(sku => ({
      'SKU Code': sku.code,
      'Product Name': sku.name,
      'Current Stock': sku.currentStock,
      'Qty Sold (Net)': sku.qtySold,
      'Revenue Generated (IDR)': sku.revenue,
      'Revenue Contribution %': sku.percentage.toFixed(2) + '%'
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Add summary information
    XLSX.utils.sheet_add_aoa(ws, [
      [],
      ['SUMMARY ANALYTICS'],
      ['Total Revenue', stats.totalRevenue],
      ['Total Items Sold', stats.totalItemsSold],
      ['Total Transactions', stats.totalTransactions],
      ['Avg Transaction Value', stats.averageTransactionValue.toFixed(2)],
      ['Total Stock', stats.totalStock]
    ], { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SKU Contribution");
    const dateStr = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toLocaleDateString();
    XLSX.writeFile(wb, `${storeName || 'EventStock'}_Analytics_${dateStr}.xlsx`);
  };

  const exportToPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0); // Black for primary text
    doc.text("EventStock Intelligence Report", 14, 25);
    
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(storeName || "Global Operations", 14, 33);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';
    doc.text(`Period: ${dateRangeStr}`, 14, 40);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 46);
    
    autoTable(doc, {
      startY: 52,
      head: [['Metric', 'Value']],
      body: [
        ['Total Realtime Revenue', `IDR ${stats.totalRevenue.toLocaleString()}`],
        ['Total Items Sold (Net)', stats.totalItemsSold.toLocaleString()],
        ['Total Transaction Base', stats.totalTransactions.toLocaleString()],
        ['Avg Transaction Value', `IDR ${stats.averageTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
        ['Total Global Current Stock', stats.totalStock.toLocaleString()],
        ['Active SKU Count', stats.totalSkus.toString()],
        ['Low Stock Alerts', stats.lowStockItems.toString()]
      ],
      headStyles: { fillColor: [15, 23, 42] },
      theme: 'striped',
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Code', 'Product', 'Stock', 'Qty Sold', 'Revenue', 'Contrib %']],
      body: stats.skuContributions.map(sku => [
        sku.code,
        sku.name,
        sku.currentStock.toLocaleString(),
        sku.qtySold.toLocaleString(),
        `IDR ${sku.revenue.toLocaleString()}`,
        sku.percentage.toFixed(2) + '%'
      ]),
      headStyles: { fillColor: [0, 0, 0] },
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    const docDateStr = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toLocaleDateString();
    doc.save(`${storeName || 'EventStock'}_Report_${docDateStr}.pdf`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Loading Dashboard...</p>
    </div>
  );
  
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-black text-accent tracking-tighter uppercase italic">
              Store <span className="text-accent underline decoration-4 decoration-accent/30 underline-offset-8">Dashboard</span>
            </h1>
            <div className="hidden md:flex items-center gap-2 bg-accent text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-accent/20 animate-pulse">
              <Box size={12} />
              {storeName || 'Global Operations'}
            </div>
          </div>
          <p className="text-slate-500 text-sm md:text-lg font-bold uppercase tracking-[0.2em] mt-2 border-l-4 border-accent pl-4">{storeName || 'Store Overview'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">From</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold focus:outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">To</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold focus:outline-none bg-transparent"
            />
          </div>
          <div className="w-px h-8 bg-border/50 mx-2 hidden md:block" />
          <button 
            onClick={exportToExcel}
            className="btn btn-outline h-11 bg-white hover:bg-success/5 hover:text-success hover:border-success/30 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="btn btn-outline h-11 bg-white hover:bg-error/5 hover:text-error hover:border-error/30 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            <FileText size={18} />
            PDF
          </button>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-6">
        <StatCard title="Realtime Revenue" value={`IDR ${stats.totalRevenue.toLocaleString()}`} icon={Banknote} color="text-accent" bg="bg-accent/10" highlight />
        <StatCard title="Transaction Count" value={stats.totalTransactions} icon={Activity} color="text-slate-700" bg="bg-slate-100" />
        <StatCard title="Avg Trans Value" value={`IDR ${stats.averageTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={TrendingDown} color="text-slate-700" bg="bg-slate-100" />
        <StatCard title="Items Sold" value={stats.totalItemsSold} icon={ShoppingBag} color="text-slate-700" bg="bg-slate-100" />
        <StatCard title="Total Stock" value={stats.totalStock} icon={Package} color="text-slate-700" bg="bg-slate-100" />
        <StatCard title="Active SKUs" value={stats.totalSkus} icon={Box} color="text-slate-700" bg="bg-slate-100" />
        <StatCard title="Stock Alerts" value={stats.lowStockItems} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-8">
        {/* Main Contribution Analysis */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="card border-none shadow-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <TrendingDown size={200} />
            </div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                  <TrendingDown className="text-primary" size={28} />
                  SKU Contribution
                </h3>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Ranking by Revenue</p>
              </div>
            </div>
            
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    <th className="pb-2 pl-4">Rank</th>
                    <th className="pb-2">SKU Detail</th>
                    <th className="pb-2 text-right">Stock</th>
                    <th className="pb-2 text-right">Qty Sold</th>
                    <th className="pb-2 text-right">Value (IDR)</th>
                    <th className="pb-2 text-right pr-4">Contrib %</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.skuContributions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-muted-foreground italic font-medium">No sales data available for contribution analysis.</td>
                    </tr>
                  ) : stats.skuContributions.map((sku, idx) => (
                    <tr key={sku.id} className="bg-muted/30 group/row hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                      <td className="py-4 pl-4 rounded-l-2xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-black text-white shadow-lg shadow-black/20 scale-110' : 'bg-white text-muted-foreground border border-border'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-sm group-hover/row:text-accent transition-colors">{sku.name}</span>
                          <span className="font-mono text-[9px] font-bold text-muted-foreground">{sku.code}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm font-bold text-muted-foreground">{sku.currentStock.toLocaleString()}</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm font-black text-primary">{sku.qtySold.toLocaleString()}</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-sm font-black text-accent">{sku.revenue.toLocaleString()}</span>
                      </td>
                      <td className="py-4 text-right pr-4 rounded-r-2xl">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-black text-primary">{sku.percentage.toFixed(1)}%</span>
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                            <div 
                              className="h-full bg-accent transition-all duration-1000" 
                              style={{ width: `${sku.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel: Recent Movements */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="card border-none shadow-2xl shadow-primary/5 min-h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                  <Activity className="text-warning" size={24} />
                  Live Activity
                </h3>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Recent Transactions</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              {stats.recentActivity.map((log) => (
                <div key={log.id} className="group/log relative pl-8 pb-4 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-[2px] before:bg-muted group-hover/log:before:bg-accent/30 before:transition-colors last:before:hidden">
                  <div className={`absolute left-[-4px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white transition-all duration-300 ${log.type === 'SHOP_OUT' ? 'bg-success shadow-lg shadow-success/20' : 'bg-error shadow-lg shadow-error/20'}`} />
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-primary uppercase tracking-tight">{log.user?.name || log.userName || 'Unknown User'}</span>
                        <span className="text-[9px] text-muted-foreground font-bold">{new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <span className={`text-[9px] font-black py-1 px-2 rounded-full uppercase tracking-tighter ${log.type === 'SHOP_OUT' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                        {log.type}
                      </span>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/50 group-hover/log:bg-white group-hover/log:shadow-md transition-all">
                      <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                        Processed <span className="text-primary font-black italic">{(log.items || []).length} SKU types</span> with a total output of <span className="text-accent font-black">{log.items?.reduce((s, i) => s + i.quantity, 0)} units</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {stats.recentActivity.length === 0 && (
                <div className="py-20 text-center text-muted-foreground italic font-medium">Awaiting first operational sync...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, highlight }: { title: string; value: string | number; icon: any; color: string; bg: string; highlight?: boolean }) {
  return (
    <div className={`card border-none shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 transform hover:-translate-y-2 group overflow-hidden ${highlight ? 'ring-2 ring-accent/10 bg-white' : 'hover:shadow-premium'}`}>
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
          <span className={`text-2xl md:text-3xl font-black tracking-tighter transition-all duration-500 ${highlight ? 'text-accent scale-105' : 'text-primary'}`}>{value}</span>
        </div>
        <div className={`p-4 rounded-2xl transition-all duration-500 group-hover:rotate-12 ${bg} ${color} shadow-sm`}>
          <Icon size={28} />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between relative z-10">
        <div className={`flex items-center gap-2 text-[10px] font-black px-2 py-1.5 rounded-lg border ${highlight ? 'bg-accent/10 text-accent border-accent/10' : 'bg-success/10 text-success border-success/10'}`}>
          <Activity size={12} />
          OPERATIONAL SYNC
        </div>
        <ArrowUpRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0" />
      </div>
      
      {/* Decorative background shape */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full transition-transform duration-700 ${highlight ? 'bg-accent/[0.03] group-hover:scale-150' : 'bg-slate-100/50 group-hover:scale-150'}`} />
    </div>
  );
}

