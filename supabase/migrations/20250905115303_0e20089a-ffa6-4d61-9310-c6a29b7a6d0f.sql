-- Create a table for clients/customers
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  idade INTEGER NOT NULL,
  telefone1 TEXT NOT NULL,
  telefone2 TEXT,
  wizebot TEXT,
  data_nascimento DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a customer management system)
CREATE POLICY "Anyone can view clients" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create clients" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update clients" 
ON public.clientes 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete clients" 
ON public.clientes 
FOR DELETE 
USING (true);

-- Create indexes for better search performance
CREATE INDEX idx_clientes_cpf ON public.clientes (cpf);
CREATE INDEX idx_clientes_telefone1 ON public.clientes (telefone1);
CREATE INDEX idx_clientes_telefone2 ON public.clientes (telefone2);
CREATE INDEX idx_clientes_data_nascimento_month ON public.clientes (EXTRACT(MONTH FROM data_nascimento));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();