'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingDown, Users, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

interface Stats {
  totalSkus: number;
  lowStockItems: number;
  totalTransactions: number;
  totalUsers: number;
  topMovingSkus: { name: string; code: string; count: number }[];
  recentActivity: { id: string; user?: { name: string }; userName?: string; createdAt: string; items: { sku: { name: string } }[] }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [skusRes, txRes] = await Promise.all([
          fetch('/api/skus'),
          fetch('/api/transactions')
        ]);
        const skusData = await skusRes.json();
        const txsData = await txRes.json();
        
        const skus = Array.isArray(skusData) ? skusData : [];
        const txs = Array.isArray(txsData) ? txsData : [];

        // Calculate Stats
        const lowStock = skus.filter((s: any) => s.quantity <= s.lowStockThreshold);
        
        // Find top moving
        const moveCounts: Record<string, { name: string; code: string; count: number }> = {};
        txs.forEach((t: any) => {
          if (t.type === 'SHOP_OUT' && t.status === 'COMPLETED') {
            t.items?.forEach((item: any) => {
              if (item.sku) {
                if (!moveCounts[item.skuId]) {
                  moveCounts[item.skuId] = { name: item.sku.name, code: item.sku.code, count: 0 };
                }
                moveCounts[item.skuId].count += item.quantity;
              }
            });
          }
        });

        const topMoving = Object.values(moveCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalSkus: skus.length,
          lowStockItems: lowStock.length,
          totalTransactions: txs.length,
          totalUsers: Array.from(new Set(txs.map((t: any) => t.userId))).length || 2,
          topMovingSkus: topMoving,
          recentActivity: txs.slice(0, 5),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading Analytics...</div>;
  if (!stats) return null;

  return (
    <AuthGuard adminOnly>
      <div className="flex flex-col gap-6 md:gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-4xl font-extrabold text-primary tracking-tight">Intelligence Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-lg">Real-time operational insights and stock metrics</p>
        </header>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="Total SKUs" value={stats.totalSkus} icon={Package} color="text-accent" bg="bg-accent/10" />
          <StatCard title="Low Stock Alerts" value={stats.lowStockItems} icon={AlertTriangle} color="text-error" bg="bg-error/10" />
          <StatCard title="Transactions" value={stats.totalTransactions} icon={Activity} color="text-success" bg="bg-success/10" />
          <StatCard title="System Users" value={stats.totalUsers} icon={Users} color="text-warning" bg="bg-warning/10" />
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Top Moving Items */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingDown className="text-accent" size={24} />
                  Most Frequently Shop-Out
                </h3>
                <ArrowUpRight className="text-muted-foreground" />
              </div>
              
              <div className="flex flex-col gap-4">
                {stats.topMovingSkus.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground italic">No data available for trends.</div>
                ) : stats.topMovingSkus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl group hover:bg-muted/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center font-bold text-accent">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.code}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-primary">{item.count}</span>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Units shop-out</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Mini Log */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-warning" size={24} />
                  Recent User Activity
                </h3>
              </div>
              
              <div className="flex flex-col gap-6">
                {stats.recentActivity.map((log) => (
                  <div key={log.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-[2px] before:bg-border last:before:hidden">
                    <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-accent ring-4 ring-white" />
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-foreground">{log.user?.name || log.userName || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deducted <span className="text-primary font-bold">{(log.items || []).length} items</span> from inventory
                      </p>
                    </div>
                  </div>
                ))}

                {stats.recentActivity.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground italic">Awaiting first operational sync...</div>
                )}
              </div>

              <button className="w-full mt-6 py-3 rounded-lg border border-dashed border-border text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-all">
                VIEW FULL AUDIT TRAIL
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
          <span className="text-4xl font-black text-primary">{value}</span>
        </div>
        <div className={`p-3 rounded-2xl ${bg} ${color}`}>
          <Icon size={24} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-success bg-success/10 w-fit px-2 py-1 rounded">
        <ArrowUpRight size={12} />
        LIVE SYNCED
      </div>
    </div>
  );
}
