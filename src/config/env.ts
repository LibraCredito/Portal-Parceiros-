// Configuração das variáveis de ambiente
export const env = {
  // Power BI API URL
  POWER_BI_URL: import.meta.env.VITE_POWER_BI_URL,
  
  // Verificar se as variáveis obrigatórias estão configuradas
  validate() {
    console.log('oi', this.POWER_BI_URL);
    if (!this.POWER_BI_URL) {
      throw new Error('VITE_POWER_BI_URL não está configurada no arquivo .env');
    }
  }
};

// Validar variáveis obrigatórias ao importar o módulo
env.validate();
