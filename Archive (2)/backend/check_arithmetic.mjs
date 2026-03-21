import { Field } from '@provablehq/sdk';

async function main() {
    const f1 = Field.fromString("10field");
    const f2 = Field.fromString("20field");

    console.log("Field Prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(f1)));

    // Check for bits methods
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(f1)).filter(m => m.includes('bits') || m.includes('Bits'));
    console.log("Bit methods:", methods);
}

main();
