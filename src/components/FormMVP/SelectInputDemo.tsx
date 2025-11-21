import React, { useState } from 'react';
import { SelectInput } from './SelectInput';

// Dados de exemplo para demonstração
const sampleOptions = [
  { Id: 1, Name: 'Alissa - Bext' },
  { Id: 2, Name: 'Alissa Alves - Bext' },
  { Id: 3, Name: 'Amanda Furtado - Bext' },
  { Id: 4, Name: 'Ana - bext' },
  { Id: 5, Name: 'Bianca Corrêa - Bext' },
  { Id: 6, Name: 'Emelin Machado - Bext' },
  { Id: 7, Name: 'Jacqueline Santos - Bext' },
  { Id: 8, Name: 'Juliana Nascimento - Bext' },
  { Id: 9, Name: 'Poliana Pires - Bext' },
  { Id: 10, Name: 'Viviane Dal Más - Bext' },
  { Id: 11, Name: 'Mel - Bext' },
  { Id: 12, Name: 'Maria Silva - Bext' },
  { Id: 13, Name: 'João Santos - Bext' },
  { Id: 14, Name: 'Pedro Oliveira - Bext' },
  { Id: 15, Name: 'Ana Costa - Bext' },
];

export const SelectInputDemo: React.FC = () => {
  const [selectedValue1, setSelectedValue1] = useState<string | number>('');
  const [selectedValue2, setSelectedValue2] = useState<string | number>('');
  const [selectedValue3, setSelectedValue3] = useState<string | number>('');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          SelectInput Melhorado
        </h1>
        <p className="text-gray-600">
          Componente de seleção com interface moderna e funcionalidades avançadas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exemplo Básico */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Exemplo Básico
          </h2>
          <SelectInput
            options={sampleOptions}
            value={selectedValue1}
            onChange={(option) => setSelectedValue1(option.Id)}
            label="Responsável"
            placeholder="Selecione um responsável"
          />
          {selectedValue1 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selecionado:</strong> {sampleOptions.find(opt => opt.Id === selectedValue1)?.Name}
              </p>
            </div>
          )}
        </div>

        {/* Exemplo com Tooltip */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Com Tooltip
          </h2>
          <SelectInput
            options={sampleOptions}
            value={selectedValue2}
            onChange={(option) => setSelectedValue2(option.Id)}
            label="Responsável"
            placeholder="Selecione um responsável"
            tooltip="Selecione o responsável pelo projeto ou tarefa"
          />
          {selectedValue2 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Selecionado:</strong> {sampleOptions.find(opt => opt.Id === selectedValue2)?.Name}
              </p>
            </div>
          )}
        </div>

        {/* Exemplo com Erro */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Com Validação de Erro
          </h2>
          <SelectInput
            options={sampleOptions}
            value={selectedValue3}
            onChange={(option) => setSelectedValue3(option.Id)}
            label="Responsável *"
            placeholder="Selecione um responsável"
            error="Este campo é obrigatório"
          />
        </div>

        {/* Exemplo com Configurações Personalizadas */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Configurações Personalizadas
          </h2>
          <SelectInput
            options={sampleOptions}
            value={selectedValue1}
            onChange={(option) => setSelectedValue1(option.Id)}
            label="Responsável"
            placeholder="Selecione um responsável"
            searchable={true}
            clearable={true}
            maxHeight={200}
          />
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• Busca habilitada</p>
            <p>• Botão de limpar visível</p>
            <p>• Altura máxima: 200px</p>
          </div>
        </div>
      </div>

      {/* Características do Componente */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          ✨ Características do Novo SelectInput
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Interface moderna e limpa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Campo de busca integrado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Botão de limpar opcional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Animações suaves</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Estados visuais claros</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Responsivo e acessível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Integração com design system</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Performance otimizada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
