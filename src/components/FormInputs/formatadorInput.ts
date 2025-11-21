export class formatadorInput {
  static formatarJuros(valor: string): string {
    const numerico = valor.replace(/[^0-9]/g, '');
    const float = parseFloat(numerico) / 100;
    if (isNaN(float)) return '0,00';
    return `${float.toFixed(2)}`;
  }

  static formatarValorMonetario(valor: string): string {
    const apenasNumeros = valor.replace(/\D/g, '');
    const valorFloat = parseFloat(apenasNumeros) / 100;
    if (isNaN(valorFloat)) return 'R$ 0,00';
    return `R$ ${valorFloat.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  static tratandoValoresInput(valor: string): number {
    valor = valor.replace('R$', '').replace(/\./g, '').replace(',', '.').replace('%', '');
    return parseFloat(valor);
  }

  static formatandoTelefone(valor: string): string {
    const numeros = valor.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 2) {
      return `(${numeros}`;
    } else if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    } else {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
    }
  }

  static formatarCPF(valor: string): string {
    const nums = valor.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  }

  static formatarCNPJ(valor: string): string {
    const nums = valor.replace(/\D/g, '').slice(0, 14);
    if (nums.length <= 2) return nums;
    if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`;
    if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
    if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
    return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`;
  }

  static tratandoData(valor: string): string {
    const nums = valor.replace(/\D/g, '');
    if (nums.length !== 8) return '';
    const dia = nums.slice(0, 2);
    const mes = nums.slice(2, 4);
    const ano = nums.slice(4, 8);
    return `${ano}-${mes}-${dia}`;
  }

  static formatarCEP(valor: string): string {
    const nums = valor.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  }
} 