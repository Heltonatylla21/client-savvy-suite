import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/validators";
import { Search, User, Phone, Calendar } from "lucide-react";

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

const ConsultaClientes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"telefone" | "cpf">("telefone");
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um termo para busca.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const cleanSearchTerm = searchTerm.replace(/\D/g, '');
      let query = supabase.from('clientes').select('*');
      
      if (searchType === "cpf") {
        query = query.eq('cpf', cleanSearchTerm);
      } else {
        // Search for phone in both telefone1 and telefone2 columns
        query = query.or(`telefone1.eq.${cleanSearchTerm},telefone2.eq.${cleanSearchTerm}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setClientes(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "Nenhum cliente encontrado",
          description: "Não foram encontrados clientes com os critérios informados.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na busca",
        description: error.message || "Ocorreu um erro ao buscar clientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Consulta de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={searchType === "telefone" ? "default" : "outline"}
                onClick={() => setSearchType("telefone")}
                size="sm"
              >
                <Phone className="w-4 h-4 mr-2" />
                Telefone
              </Button>
              <Button
                variant={searchType === "cpf" ? "default" : "outline"}
                onClick={() => setSearchType("cpf")}
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                CPF
              </Button>
            </div>
            
            <div>
              <Label htmlFor="search">
                {searchType === "telefone" ? "Pesquisar por Telefone" : "Pesquisar por CPF"}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    searchType === "telefone" 
                      ? "Digite o telefone (com ou sem DDD)" 
                      : "Digite o CPF"
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {clientes.length > 0 && (
        <div className="grid gap-4">
          {clientes.map((cliente) => (
            <Card key={cliente.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{cliente.nome}</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>CPF:</strong> {formatCPF(cliente.cpf)}</p>
                      <p><strong>Idade:</strong> {cliente.idade} anos</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Contato</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Tel 1:</strong> {formatPhone(cliente.telefone1)}</p>
                      {cliente.telefone2 && (
                        <p><strong>Tel 2:</strong> {formatPhone(cliente.telefone2)}</p>
                      )}
                      {cliente.wizebot && (
                        <p><strong>Wizebot:</strong> {cliente.wizebot}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Outras Informações</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Nascimento:</strong> {formatDate(cliente.data_nascimento)}</p>
                      <p><strong>Cadastrado em:</strong> {formatDate(cliente.created_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsultaClientes;