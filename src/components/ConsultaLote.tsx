import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatPhone } from "@/lib/validators";
import { Download, Search, FileSpreadsheet, Users } from "lucide-react";
import * as XLSX from "xlsx";

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

const ConsultaLote = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerms, setSearchTerms] = useState("");
  const [searchType, setSearchType] = useState<"cpf" | "telefone" | "all">("cpf");
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const handleBatchSearch = async () => {
    if (searchType !== "all" && !searchTerms.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite os termos para busca em lote.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let query = supabase.from("clientes").select("*").order("nome", { ascending: true });

      if (searchType === "all") {
        // Fetch all clients
      } else {
        const searchList = searchTerms
          .split(/[\n,]/)
          .map(term => term.replace(/\D/g, "").trim())
          .filter(term => term.length > 0);

        if (searchList.length === 0) {
          toast({
            title: "Termos de busca inválidos",
            description: "Digite termos válidos separados por linha ou vírgula.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        if (searchType === "cpf") {
          query = query.in("cpf", searchList.filter(cpf => cpf.length === 11));
        } else {
          const phonePatterns: string[] = [];
          searchList.forEach(phone => {
            phonePatterns.push(phone);
            if (phone.length > 9) {
              phonePatterns.push(phone.substring(2));
            }
            if (phone.length <= 9) {
              const commonDDDs = ["11", "21", "31", "41", "51", "61", "71", "81", "85"];
              commonDDDs.forEach(ddd => {
                phonePatterns.push(ddd + phone);
              });
            }
          });
          const uniquePatterns = [...new Set(phonePatterns)];
          const phoneConditions = uniquePatterns.map(pattern => 
            `telefone1.eq.${pattern},telefone2.eq.${pattern}`
          ).join(",");
          query = query.or(phoneConditions);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setClientes(data || []);
      
      toast({
        title: "Busca concluída",
        description: `Encontrados ${data?.length || 0} clientes.`,
      });
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

  const exportToExcel = () => {
    if (clientes.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Realize uma busca primeiro para exportar os resultados.",
        variant: "destructive"
      });
      return;
    }

    const excelData = clientes.map(cliente => ({
      Nome: cliente.nome,
      CPF: formatCPF(cliente.cpf),
      Idade: cliente.idade,
      Telefone1: formatPhone(cliente.telefone1),
      Telefone2: cliente.telefone2 ? formatPhone(cliente.telefone2) : "",
      Wizebot: cliente.wizebot || "",
      "Data de Nascimento": new Date(cliente.data_nascimento).toLocaleDateString("pt-BR"),
      "Data de Cadastro": new Date(cliente.created_at).toLocaleDateString("pt-BR")
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        Math.max(...excelData.map(row => String(row[key as keyof typeof row] || "").length))
      )
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    const filename = `clientes_consulta_lote_${today}.xlsx`;

    XLSX.writeFile(wb, filename);

    toast({
      title: "Exportação concluída",
      description: `Arquivo ${filename} foi baixado com sucesso.`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant={searchType === "cpf" ? "default" : "outline"}
                onClick={() => {setSearchType("cpf"); setClientes([]);}}
                size="sm"
              >
                Buscar por CPF
              </Button>
              <Button
                variant={searchType === "telefone" ? "default" : "outline"}
                onClick={() => {setSearchType("telefone"); setClientes([]);}}
                size="sm"
              >
                Buscar por Telefone
              </Button>
              <Button
                variant={searchType === "all" ? "default" : "outline"}
                onClick={() => {setSearchType("all"); setClientes([]);}}
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Buscar Todos Clientes
              </Button>
            </div>
            
            {searchType !== "all" && (
              <div>
                <Label htmlFor="searchTerms">
                  {searchType === "cpf" ? "Lista de CPFs" : "Lista de Telefones"}
                </Label>
                <Textarea
                  id="searchTerms"
                  value={searchTerms}
                  onChange={(e) => setSearchTerms(e.target.value)}
                  placeholder={
                    searchType === "cpf" 
                      ? "Digite os CPFs separados por linha ou vírgula:\n123.456.789-00\n987.654.321-00\nou\n12345678900, 98765432100"
                      : "Digite os telefones separados por linha ou vírgula:\n(11) 99999-9999\n21987654321\nou\n11999999999, 21987654321"
                  }
                  className="min-h-[120px] resize-none"
                  rows={5}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleBatchSearch} disabled={loading}>
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              
              {clientes.length > 0 && (
                <Button onClick={exportToExcel} variant="outline">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {clientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultados da Busca ({clientes.length} clientes)</span>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {clientes.map((cliente) => (
                <Card key={cliente.id} className="border-l-4 border-l-primary/30">
                  <CardContent className="pt-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsultaLote;
