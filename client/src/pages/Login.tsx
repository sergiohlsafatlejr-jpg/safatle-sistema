import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getDevBypassUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoadingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (!error) {
      setMagicLinkSent(true);
    } else {
      alert("Erro ao enviar link mágico: " + error.message);
    }
    setIsLoadingLink(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <img 
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663295218967/98MRdVE9Uf2ZRMz25bPSye/safatle-logo_81045648.png" 
            alt="Safatle Logo" 
            className="w-20 h-20 object-contain"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-center text-slate-900">
            Safatle Gerenciamento
          </h1>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Sistema de gerenciamento e comparação de arquivos de convênios médicos. Faça login para continuar.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full mt-4">
          
          {magicLinkSent ? (
            <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200 text-center text-sm">
              Enviamos um link mágico de acesso para <b>{email}</b>. Verifique sua caixa de entrada (e spam).
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-2 mb-4">
              <Input 
                type="email" 
                placeholder="Seu email corporativo" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoadingLink}
                className="h-12"
                required
              />
              <Button 
                type="submit" 
                disabled={isLoadingLink} 
                className="w-full h-12 shadow-md hover:shadow-lg transition-all"
              >
                {isLoadingLink ? "Enviando..." : "Receber Link Mágico"}
              </Button>
            </form>
          )}

          <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Ou use sua conta</span>
              </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
              variant="outline"
              className="w-full shadow-sm hover:shadow-md transition-all font-medium"
              title="Google"
            >
              G
            </Button>
            <Button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: window.location.origin } })}
              variant="outline"
              className="w-full shadow-sm hover:shadow-md transition-all font-medium"
              title="Microsoft"
            >
              MS
            </Button>
            <Button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin } })}
              variant="outline"
              className="w-full shadow-sm hover:shadow-md transition-all font-medium"
              title="Apple"
            >
              Apple
            </Button>
          </div>
          
          <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Ambiente de Teste</span>
              </div>
          </div>
          
          <Button
            type="button"
            onClick={() => {
              window.location.href = getDevBypassUrl();
            }}
            variant="secondary"
            className="w-full transition-all text-xs h-10"
          >
            Acesso Desenvolvedor (Bypass)
          </Button>
        </div>
      </div>
    </div>
  );
}
