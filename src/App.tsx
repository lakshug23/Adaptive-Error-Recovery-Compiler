import { useState } from 'react';
import { Play, FileCode, CheckCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';

interface CompileResult {
  status: string;
  tokens?: Array<{ type: string; value: string; line: number }>;
  errors?: Array<{ type: string; message: string; line?: number }>;
  message?: string;
}

function App() {
  const defaultCode = `int main() {
    int x = 10;
    printf("Hello, World!");
    return 0;
}`;

  const [code, setCode] = useState(defaultCode);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleCompile = async () => {
    setIsCompiling(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to compiler backend');
      setResult(null);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleReset = () => {
    setIsResetting(true);
    setCode(defaultCode);
    setResult(null);
    setError(null);
    setTimeout(() => setIsResetting(false), 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <FileCode className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Adaptive Error Recovery Compiler
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Code Input</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={isCompiling || isResetting}
                  className={`flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded-lg transition-all shadow-sm font-medium ${
                    isResetting ? 'animate-reset-button' : ''
                  }`}
                  title="Reset code to default"
                >
                  <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Compile Code
                    </>
                  )}
                </button>
              </div>
            </div>

            <CodeEditor value={code} onChange={setCode} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Output</h2>
              {result && (
                result.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )
              )}
            </div>

            <OutputPanel result={result} error={error} isCompiling={isCompiling} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
