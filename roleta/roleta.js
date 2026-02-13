// pages/roleta.js
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ufqhxtfsoxzrofjpvhpk.supabase.co",
  "sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt"
);

export default function Roleta() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    async function fetchLinks() {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("category", "Roleta")
        .order("position", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }
      setLinks(data || []);
    }
    fetchLinks();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-black text-center py-6">Roleta</h1>

      {links.length === 0 ? (
        <p className="text-center text-gray-500 font-bold">Nenhuma mesa ativa no momento</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-gray-100 rounded-lg hover:bg-purple-50 transition flex flex-col"
            >
              <h3 className="font-black uppercase text-sm truncate">{link.title}</h3>
              <p className="text-[10px] text-gray-500 font-bold truncate">
                {link.description || "Clique para entrar na sala"}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
