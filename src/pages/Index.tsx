import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CadastroCliente from "@/components/CadastroCliente";
import ConsultaClientes from "@/components/ConsultaClientes";
import Aniversariantes from "@/components/Aniversariantes";
import Dashboard from "@/components/Dashboard";
import { UserPlus, Search, Calendar, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Sistema de Consultas
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes de forma eficiente
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="cadastro" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger value="consulta" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Consulta
            </TabsTrigger>
            <TabsTrigger value="aniversariantes" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Aniversariantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="cadastro" className="space-y-6">
            <CadastroCliente />
          </TabsContent>

          <TabsContent value="consulta" className="space-y-6">
            <ConsultaClientes />
          </TabsContent>

          <TabsContent value="aniversariantes" className="space-y-6">
            <Aniversariantes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
