import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Phone, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalClientes: number;
  clientesEsteAno: number;
  aniversariantesHoje: number;
  aniversariantesMes: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    clientesEsteAno: 0,
    aniversariantesHoje: 0,
    aniversariantesMes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total de clientes
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      // Clientes cadastrados este ano
      const currentYear = new Date().getFullYear();
      const { count: clientesEsteAno } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${currentYear}-01-01`);

      // Aniversariantes hoje
      const today = new Date();
      const todayFormatted = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const { count: aniversariantesHoje } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .ilike('data_nascimento', `%-${todayFormatted}`);

      // Aniversariantes do mês
      const monthFormatted = String(today.getMonth() + 1).padStart(2, '0');
      const { count: aniversariantesMes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .ilike('data_nascimento', `%-${monthFormatted}-%`);

      setStats({
        totalClientes: totalClientes || 0,
        clientesEsteAno: clientesEsteAno || 0,
        aniversariantesHoje: aniversariantesHoje || 0,
        aniversariantesMes: aniversariantesMes || 0
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total de Clientes",
      value: stats.totalClientes,
      description: "Clientes cadastrados",
      icon: Users,
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Novos Este Ano",
      value: stats.clientesEsteAno,
      description: "Cadastrados em 2025",
      icon: TrendingUp,
      gradient: "from-green-500 to-green-600"
    },
    {
      title: "Aniversariantes Hoje",
      value: stats.aniversariantesHoje,
      description: "Fazem aniversário hoje",
      icon: Calendar,
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "Aniversariantes do Mês",
      value: stats.aniversariantesMes,
      description: "Fazem aniversário este mês",
      icon: Phone,
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-muted-foreground mt-2">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 shadow-card">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;