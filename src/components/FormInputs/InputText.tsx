import React, { useEffect, useRef, useState } from 'react';
import { formatadorInput } from '@/components/FormInputs/formatadorInput';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InputTextProps {
  termo: string;
  onSetName: (value: string) => void;
  placeholder?: string;
  typeInput: string;
  inputName: string;
  hasError?: boolean;
  id?: string;
  error?: string;
  tooltip?: string;
  disabled?: boolean;
  maxValue?: number; // Valor máximo para campos Money
  minValue?: number; // Valor mínimo para campos Money (aplicado no blur)
  minJuros?: number; // Valor mínimo para campo Juros (aplicado no blur)
  maxJuros?: number; // Valor máximo para campo Juros (teto em change e clamp no blur)
}

export const InputText: React.FC<InputTextProps> = ({
  termo,
  onSetName,
  placeholder,
  typeInput,
  inputName,
  hasError = false,
  id,
  error,
  tooltip,
  disabled = false,
  maxValue,
  minValue,
  minJuros,
  maxJuros,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPopup, setShowMapPopup] = useState(false);

  // Limpa estilos de erro
  const StyledInputs = (input: HTMLInputElement) => {
    if (input.value.trim()) {
      input.style.border = '';
      input.style.backgroundColor = '';
      input.style.animation = '';
      const errorMsg = input.parentNode?.querySelector('.error-message');
      if (errorMsg) {
        (errorMsg as HTMLElement).style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => errorMsg.remove(), 300);
      }
    }
  };

  // Google Places para endereço
  useEffect(() => {
    if (typeInput === 'Endereço' && inputRef.current) {
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'br' },
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onSetName(place.formatted_address);
            if (place.geometry && place.geometry.location) {
              setMapCoordinates({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              });
              setShowMapPopup(true);
            } else {
              setMapCoordinates(null);
              setShowMapPopup(false);
            }
          }
        });
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCguUuYxoJSom6m39IH70BXC3wrOGEAdiY&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (inputRef.current && (window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            const autocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
              types: ['address'],
              componentRestrictions: { country: 'br' },
            });
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.formatted_address) {
                onSetName(place.formatted_address);
                if (place.geometry && place.geometry.location) {
                  setMapCoordinates({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  });
                  setShowMapPopup(true);
                } else {
                  setMapCoordinates(null);
                  setShowMapPopup(false);
                }
              }
            });
          }
        };
        document.head.appendChild(script);
        return () => {
          document.head.removeChild(script);
        };
      }
    }
  }, [typeInput, inputRef.current]);

  useEffect(() => {
    if (typeInput === 'Endereço' && showMapPopup && mapRef.current && mapCoordinates && (window as any).google && (window as any).google.maps) {
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: mapCoordinates,
        zoom: 15,
      });
      new (window as any).google.maps.Marker({
        position: mapCoordinates,
        map: map,
      });
    }
  }, [typeInput, showMapPopup, mapCoordinates, mapRef.current]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        typeInput === 'Endereço' &&
        inputRef.current &&
        popupRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowMapPopup(false);
        setMapCoordinates(null);
      }
    };
    if (typeInput === 'Endereço') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      if (typeInput === 'Endereço') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [typeInput, inputRef, popupRef]);

  // Renderização dos inputs conforme o tipo
  return (
    <label className="block text-sm font-medium text-gray-700" style={{ position: 'relative' }}>
      <div className="flex items-center gap-2">
        {inputName}
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
      {typeInput === 'Endereço' && (
        <>
          <input
            placeholder={placeholder}
            onChange={e => onSetName(e.target.value)}
            value={termo}
            onBlur={e => StyledInputs(e.target)}
            ref={inputRef}
            className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
            type="text"
            id={id}
            autoComplete="off"
            disabled={disabled}
          />
          {error && (
            <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </div>
          )}
          {showMapPopup && mapCoordinates && (
            <div
              ref={popupRef}
              style={{
                position: 'absolute',
                left: '0',
                top: 'calc(100% + 16px)',
                width: '400px',
                height: '300px',
                borderRadius: '8px',
                zIndex: 1000,
                boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                backgroundColor: 'white',
              }}
            >
              <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }}></div>
            </div>
          )}
        </>
      )}
      {typeInput === 'Phone' && (
        <input
          autoComplete="off"
          placeholder={placeholder}
          onChange={e => onSetName(formatadorInput.formatandoTelefone(e.target.value))}
          onBlur={e => StyledInputs(e.target)}
          value={termo}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Phone' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Text' && (
        <input
          placeholder={placeholder}
          onChange={e => onSetName(e.target.value)}
          value={termo}
          onBlur={e => StyledInputs(e.target)}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Text' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Juros' && (
        <input
          placeholder={placeholder}
          onChange={e => {
            const formatted = formatadorInput.formatarJuros(e.target.value);
            // teto em tempo real
            if (typeof maxJuros === 'number') {
              const num = parseFloat(formatted);
              if (!isNaN(num) && num > maxJuros) {
                onSetName(maxJuros.toFixed(2));
                return;
              }
            }
            onSetName(formatted);
          }}
          value={termo}
          onBlur={e => {
            StyledInputs(e.target);
            const current = parseFloat(termo || '');
            if (!isNaN(current)) {
              let v = current;
              if (typeof minJuros === 'number' && v < minJuros) v = minJuros;
              if (typeof maxJuros === 'number' && v > maxJuros) v = maxJuros;
              const clamped = v.toFixed(2);
              if (clamped !== termo) onSetName(clamped);
            }
          }}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Juros' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Money' && (
        <input
          placeholder={placeholder}
          onPaste={e => {
            // Interceptar colagem para validar antes
            if (maxValue !== undefined) {
              e.preventDefault();
              const textoColado = e.clipboardData.getData('text');
              const apenasNumeros = textoColado.replace(/\D/g, '');
              
              if (apenasNumeros) {
                const maxValueCentavos = maxValue * 100;
                const maxDigitos = maxValueCentavos.toString().length;
                const numerosLimitados = apenasNumeros.slice(0, maxDigitos);
                const valorNumerico = parseFloat(numerosLimitados) / 100;
                
                if (!isNaN(valorNumerico) && valorNumerico > maxValue) {
                  const valorFormatado = formatadorInput.formatarValorMonetario(maxValueCentavos.toString());
                  onSetName(valorFormatado);
                } else if (numerosLimitados) {
                  const valorFormatado = formatadorInput.formatarValorMonetario(numerosLimitados);
                  onSetName(valorFormatado);
                }
              }
            }
          }}
          onKeyDown={e => {
            // Se há um valor máximo definido, verificar antes de permitir digitação
            if (maxValue !== undefined) {
              // Obter o valor atual formatado e extrair número
              const valorAtualNumeros = termo.replace(/\D/g, '');
              const maxValueCentavos = maxValue * 100;
              const maxDigitos = maxValueCentavos.toString().length;
              
              // Permitir teclas de navegação, backspace, delete, tab, etc
              const teclasPermitidas = [
                'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End'
              ];
              
              // Permitir Ctrl+A, Ctrl+C, Ctrl+X, etc (mas não Ctrl+V, que é tratado no onPaste)
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() !== 'v') {
                return;
              }
              
              // Se é um número, verificar se pode digitar
              if (e.key.match(/^\d$/)) {
                // Se já tem o máximo de dígitos, bloquear
                if (valorAtualNumeros.length >= maxDigitos) {
                  e.preventDefault();
                  return;
                }
              }
            }
          }}
          onChange={e => {
            const valorRaw = e.target.value;
            
            // Se há um valor máximo definido, verificar e limitar
            if (maxValue !== undefined) {
              // Extrair apenas números do valor bruto
              const apenasNumerosRaw = valorRaw.replace(/\D/g, '');
              
              // Calcular quantos dígitos o máximo tem (em centavos)
              const maxValueCentavos = maxValue * 100;
              const maxDigitos = maxValueCentavos.toString().length;
              
              // Se não há números, permitir campo vazio (será formatado como R$ 0,00)
              if (!apenasNumerosRaw || apenasNumerosRaw === '0') {
                const valorFormatado = formatadorInput.formatarValorMonetario('0');
                onSetName(valorFormatado);
                return;
              }
              
              // Limitar número de dígitos ao máximo permitido
              let numerosLimitados = apenasNumerosRaw;
              if (numerosLimitados.length > maxDigitos) {
                numerosLimitados = numerosLimitados.slice(0, maxDigitos);
              }
              
              // Converter para valor numérico
              const valorNumerico = parseFloat(numerosLimitados) / 100;
              
              // Se o valor excede o máximo, forçar o valor máximo
              if (!isNaN(valorNumerico) && valorNumerico > maxValue) {
                const valorFormatado = formatadorInput.formatarValorMonetario(maxValueCentavos.toString());
                onSetName(valorFormatado);
                return;
              }
              
              // Formatar o valor válido
              const valorFormatado = formatadorInput.formatarValorMonetario(numerosLimitados);
              
              // Verificação final de segurança: extrair números do valor formatado e verificar novamente
              const numerosFormatados = valorFormatado.replace(/\D/g, '');
              const valorFinal = parseFloat(numerosFormatados) / 100;
              
              if (!isNaN(valorFinal) && valorFinal > maxValue) {
                onSetName(formatadorInput.formatarValorMonetario(maxValueCentavos.toString()));
                return;
              }
              
              onSetName(valorFormatado);
              return;
            }
            
            // Formatar normalmente se não há limite
            const valorFormatado = formatadorInput.formatarValorMonetario(valorRaw);
            onSetName(valorFormatado);
          }}
          value={termo}
          onBlur={e => {
            StyledInputs(e.target);
            // Clamp mínimo/máximo ao sair do campo
            if (minValue !== undefined || maxValue !== undefined) {
              const numeros = (termo || e.target.value || '').replace(/\D/g, '');
              const atual = numeros ? parseFloat(numeros) / 100 : 0;
              let v = atual;
              if (minValue !== undefined && v < minValue) v = minValue;
              if (maxValue !== undefined && v > maxValue) v = maxValue;
              const centavos = Math.round(v * 100).toString();
              const formatado = formatadorInput.formatarValorMonetario(centavos);
              if (formatado !== termo) onSetName(formatado);
            }
          }}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Money' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Money' && disabled && (
        <div className="mt-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Valor calculado automaticamente
        </div>
      )}
      {typeInput === 'Cpf' && (
        <input
          placeholder={placeholder}
          onChange={e => onSetName(formatadorInput.formatarCPF(e.target.value))}
          value={termo}
          onBlur={e => StyledInputs(e.target)}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Cpf' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Cnpj' && (
        <input
          placeholder={placeholder}
          onChange={e => onSetName(formatadorInput.formatarCNPJ(e.target.value))}
          value={termo}
          onBlur={e => StyledInputs(e.target)}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Cnpj' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Cep' && (
        <input
          placeholder={placeholder}
          onChange={e => onSetName(formatadorInput.formatarCEP(e.target.value))}
          value={termo}
          onBlur={e => StyledInputs(e.target)}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          type="text"
          id={id}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Cep' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      {typeInput === 'Date' && (
        <input
          placeholder={placeholder}
          onChange={e => onSetName(e.target.value)}
          value={termo}
          onBlur={e => StyledInputs(e.target)}
          type="date"
          id={id}
          className={`mt-1 w-full px-4 py-2 rounded-lg border ${hasError ? 'border-red-500' : 'border-gray-300'} bg-gray-50 text-gray-900 focus:ring-2 focus:ring-green-400 focus:outline-none ${disabled ? 'opacity-75 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-700' : ''}`}
          disabled={disabled}
        />
      )}
      {error && typeInput === 'Date' && (
        <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
    </label>
  );
}; 