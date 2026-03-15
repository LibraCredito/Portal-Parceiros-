import React from 'react';
import Select from 'react-select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SelectInputProps {
  options: { Id: number | string; Name: string }[];
  value?: string | number;
  onChange?: (option: any) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  tooltip?: string;
  isSearchable?: boolean;
  isLoading?: boolean;
  onInputChange?: (inputValue: string) => void;
  inputValue?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  error,
  tooltip,
  isSearchable = true,
  isLoading = false,
  onInputChange,
  inputValue,
}) => {
  // Transforma as opções para o formato do react-select (exclui PJ da lista)
  const selectOptions = options
    .filter(opt => opt.Name !== "Pessoa Jurídica")
    .map(opt => ({ value: String(opt.Id), label: opt.Name }));
  const selectedOption = selectOptions.find(opt => String(opt.value) === String(value));

  return (
    <div className="flex flex-col w-full">
      {label && (
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm font-medium text-blue-900">{label}</label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <Select
        options={selectOptions}
        value={selectedOption || null}
        onChange={selected => {
          if (selected && onChange) {
            onChange({ Id: selected.value, Name: selected.label });
          } else if (onChange) {
            onChange({ Id: '', Name: '' });
          }
        }}
        placeholder={placeholder || 'Selecione uma opção'}
        isSearchable={isSearchable}
        isLoading={isLoading}
        onInputChange={onInputChange}
        inputValue={inputValue}
        noOptionsMessage={({ inputValue }) => {
          if (!inputValue) return 'Digite para buscar...';
          if (isLoading) return 'Carregando...';
          return 'Nenhuma opção encontrada';
        }}
        loadingMessage={() => 'Carregando opções...'}
        styles={{
          control: (provided) => ({
            ...provided,
            minHeight: '40px',
            height: '40px',
          }),
          valueContainer: (provided) => ({
            ...provided,
            height: '40px',
            padding: '0 8px',
          }),
          input: (provided) => ({
            ...provided,
            margin: '0px',
          }),
          indicatorSeparator: () => ({
            display: 'none',
          }),
          indicatorsContainer: (provided) => ({
            ...provided,
            height: '40px',
          }),
          menu: (provided) => ({
            ...provided,
            maxHeight: 300, // Reduzido para melhor performance
            minWidth: '100%',
          }),
          option: (provided, state) => ({
            ...provided,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            maxWidth: 400,
            backgroundColor: state.isFocused ? '#4B5563' : '#6B7280',
            color: 'white',
            '&:hover': {
              backgroundColor: '#4B5563',
              color: 'white',
            },
          }),
          menuList: (provided) => ({
            ...provided,
            backgroundColor: '#6B7280',
          }),
        }}
        isClearable
      />
      {error && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}; 