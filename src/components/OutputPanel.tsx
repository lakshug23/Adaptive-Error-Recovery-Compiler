import { AlertCircle, CheckCircle, Code, AlertTriangle } from 'lucide-react';

interface Token {
  type: string;
  value: string;
  line: number;
}

interface Error {
  type: string;
  message: string;
  line?: number;
}

interface CompileResult {
  status: string;
  tokens?: Token[];
  errors?: Error[];
  message?: string;
}

interface OutputPanelProps {
  result: CompileResult | null;
  error: string | null;
  isCompiling: boolean;
}

function OutputPanel({ result, error, isCompiling }: OutputPanelProps) {
  if (isCompiling) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-8 h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Analyzing code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 h-[500px]">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Connection Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              Make sure your backend server is running on http://localhost:8000
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-8 h-[500px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Code className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Ready to compile</p>
          <p className="text-sm mt-2">Click the "Compile Code" button to analyze your code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm h-[500px] flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3 border-b border-blue-200">
        <div className="flex items-center gap-2">
          {result.status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          )}
          <span className="font-medium text-gray-900">
            {result.message || 'Compilation Results'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {result.tokens && result.tokens.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-primary-600" />
              Tokens Generated
            </h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-primary-100 border-b border-primary-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-primary-900">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-primary-900">Value</th>
                    <th className="text-left px-3 py-2 font-semibold text-primary-900">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {result.tokens.map((token, idx) => (
                    <tr key={idx} className="hover:bg-gray-100 transition-colors">
                      <td className="px-3 py-2 font-mono text-primary-700">{token.type}</td>
                      <td className="px-3 py-2 font-mono text-gray-700">{token.value}</td>
                      <td className="px-3 py-2 text-gray-600">{token.line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result.errors && result.errors.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Errors Detected
            </h3>
            <div className="space-y-2">
              {result.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-red-900 uppercase">
                          {err.type}
                        </span>
                        {err.line && (
                          <span className="text-xs text-red-700">Line {err.line}</span>
                        )}
                      </div>
                      <p className="text-sm text-red-800">{err.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.tokens && result.tokens.length === 0 && result.errors && result.errors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No output generated</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;
