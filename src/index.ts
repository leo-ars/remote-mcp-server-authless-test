import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// Ecommerce product search tool
		const fakeProducts = [
			{
				id: 1,
				name: "Wireless Mouse",
				description: "A smooth and responsive wireless mouse.",
				price: 19.99,
				category: "Electronics",
				inStock: true,
			},
			{
				id: 2,
				name: "Bluetooth Headphones",
				description: "Noise-cancelling over-ear headphones.",
				price: 59.99,
				category: "Electronics",
				inStock: false,
			},
			{
				id: 3,
				name: "Coffee Mug",
				description: "Ceramic mug for hot beverages.",
				price: 7.5,
				category: "Home & Kitchen",
				inStock: true,
			},
			{
				id: 4,
				name: "Yoga Mat",
				description: "Non-slip yoga mat for all exercises.",
				price: 25.0,
				category: "Sports",
				inStock: true,
			},
			{
				id: 5,
				name: "Desk Lamp",
				description: "LED desk lamp with adjustable brightness.",
				price: 15.99,
				category: "Home & Kitchen",
				inStock: true,
			},
		];

		this.server.tool(
			"search_products",
			{
				query: z.string().describe("Search term for product name or description"),
				category: z.string().optional().describe("Optional product category filter"),
				inStock: z.boolean().optional().describe("Filter by stock availability"),
			},
			async ({ query, category, inStock }) => {
				const results = fakeProducts.filter((product) => {
					const matchesQuery =
						product.name.toLowerCase().includes(query.toLowerCase()) ||
						product.description.toLowerCase().includes(query.toLowerCase());
					const matchesCategory = category
						? product.category.toLowerCase() === category.toLowerCase()
						: true;
					const matchesStock =
						inStock === undefined ? true : product.inStock === inStock;
					return matchesQuery && matchesCategory && matchesStock;
				});
				if (results.length === 0) {
					return {
						content: [
							{ type: "text", text: "No products found matching your search." },
						],
					};
				}
				return {
					content: [
						{
							type: "text",
							text: results
								.map(
									(p) =>
										`[${p.name}] $${p.price} (${p.category}) - ${p.inStock ? "In stock" : "Out of stock"}`
								)
								.join("\n"),
						},
					],
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
