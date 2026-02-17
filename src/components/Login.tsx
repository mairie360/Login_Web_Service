"use client";

import Image from "next/image";
import { InputManager, Button } from "@mairie360/lib-components";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    console.log("Login with:", { email, password, rememberMe });
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#F5F3F0]">
        <Image src="/logo.png" alt="Logo" width={400} height={400} className="mt-30 mb-4" />

        <div className="flex flex-col items-start gap-4 w-full max-w-md p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.10),0_8px_10px_-6px_rgba(0,0,0,0.10)] [&_input]:!my-0 [&_*]:!mb-0">
            <h2 className="text-2xl font-bold text-gray-900 !mb-2">Connexion</h2>
            <div className="w-full flex flex-col gap-1">
                <p className="text-sm text-gray-500">Email professionnel</p>
                <InputManager 
                    label="" 
                    name="email" 
                    onChange={(e) => setEmail(e.target.value)} 
                    type="email" value={email}  
                />
            </div>
            <div className="w-full flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Mot de passe</p>
                    <a href="#" className="text-sm text-[#4B908D] hover:underline">Mot de passe oublié ?</a>
                </div>
                <InputManager 
                    label="" 
                    name="password" 
                    onChange={(e) => setPassword(e.target.value)} 
                    type="password" 
                    value={password}  
                />
            </div>
            <div className="w-full flex flex-row items-center [&_label]:text-gray-900">
                <InputManager
                    label="Se souvenir de moi"
                    name="remember"
                    type="checkbox"
                    onChange={() => setRememberMe(!rememberMe)}
                    value={rememberMe}
                />
            </div>
            <div className="w-full [&>button]:flex [&>button]:w-full [&>button]:py-[9px] [&>button]:pb-[11px] [&>button]:px-0 [&>button]:justify-center [&>button]:items-center [&>button]:self-stretch [&>button]:rounded-md [&>button]:bg-[#1256A6] [&>button]:shadow-[0_10px_15px_-3px_rgba(18,86,166,0.30),0_4px_6px_-4px_rgba(18,86,166,0.30)] [&>button]:hover:bg-[#0e4785]">
                <Button label="Se connecter" onClick={() => handleLogin()} primary/>
            </div>

        </div>
        <p className="mt-6 text-sm text-gray-500">
            © 2026 Mairie360. Tous droits réservés.
        </p>
    </div>
  );
}