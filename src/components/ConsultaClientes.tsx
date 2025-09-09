import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/validators";
import { Search, User, Phone, Calendar, Users, Trash2 } from "lucide-react";

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
  const [searchType, setSearchType] = useState<"telefone" | "cpf" | "lote">("telefone");
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
      } else if (searchType === "lote") {
        // Split CPFs by line break or comma and clean them
        const cpfList = searchTerm
          .split(/[\n,]/)
          .map(cpf => cpf.replace(/\D/g, '').trim())
          .filter(cpf => cpf.length === 11);
        
        if (cpfList.length === 0) {
          toast({
            title: "CPFs inválidos",
            description: "Digite CPFs válidos separados por linha ou vírgula.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        query = query.in('cpf', cpfList);
      } else {
        // Enhanced phone search: search with and without DDD
        const phonePatterns = [cleanSearchTerm];
        
        // If has more than 9 digits, also search without the first 2 (DDD)
        if (cleanSearchTerm.length > 9) {
          phonePatterns.push(cleanSearchTerm.substring(2));
        }
        
        // If has 9 digits or less, also search with common DDDs
        if (cleanSearchTerm.length <= 9) {
          const commonDDDs = ['11', '21', '31', '41', '51', '61', '71', '81', '85'];
          commonDDDs.forEach(ddd => {
            phonePatterns.push(ddd + cleanSearchTerm);
          });
        }
        
        // Create OR conditions for all phone patterns
        const phoneConditions = phonePatterns.map(pattern => 
          `telefone1.eq.${pattern},telefone2.eq.${pattern}`
        ).join(',');
        
        query = query.or(phoneConditions);
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

  const handleDeleteClient = async (clienteId: string, clienteNome: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o cliente ${clienteNome}?`);
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;

      // Remove client from local state
      setClientes(clientes.filter(c => c.id !== clienteId));
      
      toast({
        title: "Cliente excluído",
        description: `${clienteNome} foi excluído com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Ocorreu um erro ao excluir o cliente.",
        variant: "destructive"
      });
    }
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
              <Button
                variant={searchType === "lote" ? "default" : "outline"}
                onClick={() => setSearchType("lote")}
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Lote CPFs
              </Button>
            </div>
            
            <div>
              <Label htmlFor="search">
                {searchType === "telefone" ? "Pesquisar por Telefone" : 
                 searchType === "cpf" ? "Pesquisar por CPF" : "Pesquisar por Lote de CPFs"}
              </Label>
              <div className="flex gap-2 mt-1">
                {searchType === "lote" ? (
                  <textarea
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite os CPFs separados por linha ou vírgula&#10;Ex:&#10;123.456.789-00&#10;987.654.321-00&#10;ou&#10;12345678900, 98765432100"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    rows={4}
                  />
                ) : (
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
                )}
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
                    <div className="mt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClient(cliente.id, cliente.nome)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Cliente
                      </Button>
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