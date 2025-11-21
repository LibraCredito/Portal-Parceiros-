import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Calendar, ArrowUpAZ, Download, Link } from 'lucide-react';

interface MaterialFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  totalResults: number;
  appliedFilters: string[];
}

const typeOptions = [
  { id: 'all', label: 'Todos os Materiais' },
  { id: 'with-pdf', label: 'Com PDF para Download' },
  { id: 'with-link', label: 'Somente com Link Externo' }
];

const sortOptions = [
  { id: 'recent', label: 'Mais Recentes', icon: Calendar },
  { id: 'alphabetical', label: 'A-Z', icon: ArrowUpAZ }
];

const MaterialFilter: React.FC<MaterialFilterProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeChange,
  totalResults,
  appliedFilters
}) => {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  {option.id === 'with-pdf' && <Download className="h-4 w-4" />}
                  {option.id === 'with-link' && <Link className="h-4 w-4" />}
                  {option.id === 'all' && <Filter className="h-4 w-4" />}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      {(searchTerm || typeFilter !== 'all' || sortBy !== 'recent') && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Exibindo {totalResults} resultado{totalResults !== 1 ? 's' : ''}</span>
              {appliedFilters.length > 0 && (
                <span> para: {appliedFilters.join(' | ')}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onTypeChange('all');
                onSortChange('recent');
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialFilter;
