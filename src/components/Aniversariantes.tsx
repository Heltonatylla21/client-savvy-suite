import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/validators";
import { Calendar, Gift } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  idade: number;
  telefone1: string;
  telefone2: string | null;
  wizebot: string | null;
  data_nascimento: string;
  created_at: string;
}

const Aniversariantes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [aniversariantes, setAniversariantes] = useState<Cliente[]>([]);

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  useEffect(() => {
    // Set current month as default
    const currentMonth = new Date().getMonth() + 1;
    setSelectedMonth(currentMonth.toString());
    handleSearch(currentMonth.toString());
  }, []);

  const handleSearch = async (month?: string) => {
    const monthToSearch = month || selectedMonth;
    
    if (!monthToSearch) {
      toast({
        title: "Selecione um mês",
        description: "Por favor, selecione um mês para buscar os aniversariantes.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .filter('data_nascimento', 'gte', `2000-${monthToSearch.padStart(2, '0')}-01`)
        .filter('data_nascimento', 'lt', `2000-${(parseInt(monthToSearch) + 1).toString().padStart(2, '0')}-01`)
        .order('data_nascimento', { ascending: true });

      if (error) throw error;

      // Filter by month using JavaScript to handle different years
      const filtered = (data || []).filter(cliente => {
        const birthMonth = new Date(cliente.data_nascimento).getMonth() + 1;
        return birthMonth === parseInt(monthToSearch);
      });

      setAniversariantes(filtered);
      
      if (filtered.length === 0) {
        toast({
          title: "Nenhum aniversariante encontrado",
          description: `Não há aniversariantes no mês de ${months.find(m => m.value === monthToSearch)?.label}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na busca",
        description: error.message || "Ocorreu um erro ao buscar aniversariantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDayOfMonth = (dateString: string) => {
    return new Date(dateString).getDate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Aniversariantes do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Selecione o mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleSearch()} disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {aniversariantes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {aniversariantes.length} aniversariante(s) encontrado(s)
              <Badge variant="secondary">
                {months.find(m => m.value === selectedMonth)?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {aniversariantes
                .sort((a, b) => getDayOfMonth(a.data_nascimento) - getDayOfMonth(b.data_nascimento))
                .map((cliente) => (
                <Card key={cliente.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{cliente.nome}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Dia {getDayOfMonth(cliente.data_nascimento)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="space-y-1 text-sm">
                          <p><strong>CPF:</strong> {formatCPF(cliente.cpf)}</p>
                          <p><strong>Idade:</strong> {cliente.idade} anos</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Tel 1:</strong> {formatPhone(cliente.telefone1)}</p>
                          {cliente.telefone2 && (
                            <p><strong>Tel 2:</strong> {formatPhone(cliente.telefone2)}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Nascimento:</strong> {formatDate(cliente.data_nascimento)}</p>
                          {cliente.wizebot && (
                            <p><strong>Wizebot:</strong> {cliente.wizebot}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Aniversariantes;