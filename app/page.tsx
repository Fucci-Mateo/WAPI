"use client";
import { useEffect, useState } from "react";
import WhatsAppInterface from "@/app/components/WhatsAppInterface";
import { NumberOption } from "@/app/components/types";

export default function HomePage() {
  const [numberOptions, setNumberOptions] = useState<NumberOption[]>([]);

  useEffect(() => {
    const fetchNumbers = async () => {
      try {
        const response = await fetch('/api/numbers');
        if (response.ok) {
          const numbers = await response.json();
          setNumberOptions(numbers.map((n: any) => ({
            id: n.id,
            label: n.label || n.phoneNumber || n.numberId,
            numberId: n.numberId,
            wabaId: n.wabaId,
          })));
        } else {
          console.error('Failed to fetch numbers:', response.statusText);
          setNumberOptions([]);
        }
      } catch (error) {
        console.error('Error fetching numbers:', error);
        setNumberOptions([]);
      }
    };

    fetchNumbers();
  }, []);

  return (
    <main className="h-screen">
      <WhatsAppInterface numberOptions={numberOptions} />
    </main>
  );
}
