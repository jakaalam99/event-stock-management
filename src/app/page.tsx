'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingDown, AlertTriangle, ArrowUpRight, Activity, DollarSign, ShoppingBag, Download, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
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
  skuContributions: SkuContribution[];
  recentActivity: Transaction[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [skusRes, txRes] = await Promise.all([
        fetch('/api/skus'),
        fetch('/api/transactions')
      ]);
      const skusData = await skusRes.json();
      const txsData = await txRes.json();
      
      const skus: SKU[] = Array.isArray(skusData) ? skusData : [];
      const txs: Transaction[] = Array.isArray(txsData) ? txsData : [];

      // Calculate Basic Stats
      const lowStock = skus.filter((s: SKU) => s.quantity <= s.lowStockThreshold);
      
      let totalRevenue = 0;
      let totalItemsSold = 0;
      const moveCounts: Record<string, { name: string; code: string; qty: number; val: number; stock: number }> = {};

      // Initialize with all SKUs so we show current stock even for those items with no sales
      skus.forEach(s => {
        moveCounts[s.id] = { name: s.name, code: s.code, qty: 0, val: 0, stock: s.quantity };
      });

      txs.forEach((t: Transaction) => {
        if (t.status === 'COMPLETED') {
          const multiplier = t.type === 'SHOP_OUT' ? 1 : -1;
          
          t.items?.forEach((item: TransactionItem) => {
            if (item.sku) {
              const qty = item.quantity * multiplier;
              const value = (item.sku.srp || 0) * qty;
              
              totalRevenue += value;
              totalItemsSold += qty;

              if (moveCounts[item.skuId]) {
                moveCounts[item.skuId].qty += qty;
                moveCounts[item.skuId].val += value;
              }
            }
          });
        }
      });

      const skuContributions: SkuContribution[] = Object.entries(moveCounts)
        .map(([id, data]) => ({
          id,
          code: data.code,
          name: data.name,
          qtySold: data.qty,
          currentStock: data.stock,
          revenue: data.val,
          percentage: totalRevenue > 0 ? (data.val / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setStats({
        totalSkus: skus.length,
        lowStockItems: lowStock.length,
        totalTransactions: txs.length,
        totalUsers: Array.from(new Set(txs.map((t: Transaction) => t.userId))).length || 0,
        totalRevenue,
        totalItemsSold,
        skuContributions,
        recentActivity: txs.slice(0, 10),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SKU Contribution");
    XLSX.writeFile(wb, `EventStock_Analytics_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(20, 184, 166); // Accent color
    doc.text("EventStock Intelligence Report", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
    
    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Realtime Revenue', `IDR ${stats.totalRevenue.toLocaleString()}`],
        ['Total Items Sold (Net)', stats.totalItemsSold.toLocaleString()],
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
      headStyles: { fillColor: [20, 184, 166] },
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    doc.save(`EventStock_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Computing Intelligence...</p>
    </div>
  );
  
  if (!stats) return null;

  return (
    <AuthGuard adminOnly>
      <div className="flex flex-col gap-6 md:gap-8 pb-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter uppercase italic">
              Intelligence <span className="text-accent underline decoration-4 decoration-accent/30 underline-offset-8">Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-lg font-medium">Real-time revenue and SKU contribution metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="Realtime Revenue" value={`IDR ${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-accent" bg="bg-accent/10" highlight />
          <StatCard title="Items Sold" value={stats.totalItemsSold} icon={ShoppingBag} color="text-success" bg="bg-success/10" />
          <StatCard title="Active SKUs" value={stats.totalSkus} icon={Package} color="text-primary" bg="bg-primary/5" />
          <StatCard title="Stock Alerts" value={stats.lowStockItems} icon={AlertTriangle} color="text-error" bg="bg-error/10" />
        </div>

        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {/* Main Contribution Analysis */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <div className="card border-none shadow-2xl shadow-primary/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                <TrendingDown size={200} />
              </div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
                    <TrendingDown className="text-accent" size={28} />
                    SKU Contribution
                  </h3>
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Ranking by Revenue Generation</p>
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
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-110' : 'bg-white text-muted-foreground border border-border'}`}>
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
    </AuthGuard>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, highlight }: { title: string; value: string | number; icon: any; color: string; bg: string; highlight?: boolean }) {
  return (
    <div className={`card border-none shadow-xl transition-all duration-500 transform hover:-translate-y-2 group overflow-hidden ${highlight ? 'shadow-accent/5 ring-1 ring-accent/5 bg-gradient-to-br from-white to-accent/5' : 'shadow-primary/5 hover:shadow-primary/10'}`}>
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</span>
          <span className={`text-2xl md:text-3xl font-black tracking-tighter transition-all duration-500 ${highlight ? 'text-accent scale-105' : 'text-primary group-hover:text-accent'}`}>{value}</span>
        </div>
        <div className={`p-4 rounded-2xl transition-all duration-500 group-hover:rotate-12 ${bg} ${color}`}>
          <Icon size={28} className={highlight ? 'animate-pulse' : ''} />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between items-center relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/10 px-2 py-1.5 rounded-lg border border-success/10">
          <Activity size={12} />
          LIVE METRIC
        </div>
        <ArrowUpRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0" />
      </div>
      
      {/* Decorative background shape */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/[0.02] rounded-full group-hover:scale-150 transition-transform duration-700" />
    </div>
  );
}
