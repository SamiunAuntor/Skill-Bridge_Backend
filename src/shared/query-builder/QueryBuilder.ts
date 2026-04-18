import {
    PaginationInput,
    PaginationResult,
    QueryBuilderBuildResult,
    SearchConditionFactory,
    SortResolver,
} from "./query-builder.types";

type AndCapableWhere = {
    AND?: unknown;
};

export class QueryBuilder<TWhere extends AndCapableWhere, TOrderBy> {
    private readonly where: TWhere;
    private orderBy: TOrderBy[] = [];
    private pagination: PaginationResult | null = null;

    constructor(baseWhere: TWhere) {
        this.where = { ...baseWhere };
    }

    filter(condition: TWhere | null | undefined): this {
        if (!condition) {
            return this;
        }

        this.addAndCondition(condition);
        return this;
    }

    search(
        searchTerm: string | undefined,
        createConditions: SearchConditionFactory<TWhere>
    ): this {
        const normalizedSearchTerm = searchTerm?.trim();

        if (!normalizedSearchTerm) {
            return this;
        }

        const conditions = createConditions(normalizedSearchTerm);

        if (conditions.length > 0) {
            this.addAndCondition({
                OR: conditions,
            } as unknown as TWhere);
        }

        return this;
    }

    sort<TSortOption>(
        sortBy: TSortOption,
        resolveSort: SortResolver<TSortOption, TOrderBy>
    ): this {
        this.orderBy = resolveSort(sortBy);
        return this;
    }

    paginate(input: PaginationInput): this {
        this.pagination = {
            page: input.page,
            limit: input.limit,
            skip: (input.page - 1) * input.limit,
            take: input.limit,
        };

        return this;
    }

    build(): QueryBuilderBuildResult<TWhere, TOrderBy> {
        return {
            where: this.where,
            orderBy: this.orderBy,
            pagination: this.pagination,
        };
    }

    private addAndCondition(condition: TWhere): void {
        const currentAnd = Array.isArray(this.where.AND)
            ? [...this.where.AND]
            : this.where.AND
            ? [this.where.AND]
            : [];

        currentAnd.push(condition);
        this.where.AND = currentAnd;
    }
}
