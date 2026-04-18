export interface PaginationInput {
    page: number;
    limit: number;
}

export interface PaginationResult extends PaginationInput {
    skip: number;
    take: number;
}

export interface QueryBuilderBuildResult<TWhere, TOrderBy> {
    where: TWhere;
    orderBy: TOrderBy[];
    pagination: PaginationResult | null;
}

export interface SearchConditionFactory<TWhere> {
    (searchTerm: string): TWhere[];
}

export interface SortResolver<TSortOption, TOrderBy> {
    (sortBy: TSortOption): TOrderBy[];
}
